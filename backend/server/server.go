package server

import (
	"context"
	"crypto/rand"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/mnehpets/mtranscribe/backend/config"
	"github.com/mnehpets/oneserve/auth"
	"github.com/mnehpets/oneserve/endpoint"
	"github.com/mnehpets/oneserve/middleware"
	"golang.org/x/oauth2"
)

// Server encapsulates the HTTP server and its dependencies.
type Server struct {
	cfg              *config.Config
	sessionProcessor endpoint.Processor
	registry         *auth.Registry
	mux              *http.ServeMux
}

// New creates a new Server instance with the given configuration.
func New(cfg *config.Config) (*Server, error) {
	s := &Server{
		cfg: cfg,
		mux: http.NewServeMux(),
	}

	if err := s.setupSession(); err != nil {
		return nil, fmt.Errorf("failed to setup session: %w", err)
	}

	if err := s.setupAuth(); err != nil {
		return nil, fmt.Errorf("failed to setup auth: %w", err)
	}

	s.setupRoutes()

	return s, nil
}

// setupSession initializes the session processor.
func (s *Server) setupSession() error {
	// Use the session key from config
	sessionKey := s.cfg.SessionKey
	if len(sessionKey) == 0 {
		// Generate a random session key if not provided
		sessionKey = make([]byte, 32)
		if _, err := rand.Read(sessionKey); err != nil {
			return fmt.Errorf("failed to generate session key: %w", err)
		}
		log.Println("Warning: Using randomly generated session key. Sessions will not persist across restarts.")
	}

	// Create session processor with secure cookie settings
	var err error
	s.sessionProcessor, err = middleware.NewSessionProcessor(
		middleware.DefaultCookieName,
		"key1",
		map[string][]byte{"key1": sessionKey},
		middleware.WithCookieOptions("/", "", s.cfg.SecureCookie, true, http.SameSiteLaxMode),
	)
	if err != nil {
		return err
	}

	return nil
}

// setupAuth initializes the auth registry and Notion OAuth provider.
func (s *Server) setupAuth() error {
	s.registry = auth.NewRegistry()

	// Only setup Notion OAuth if credentials are provided
	if s.cfg.NotionClientID != "" && s.cfg.NotionClientSecret != "" {
		// Notion OAuth2 configuration
		notionConfig := &oauth2.Config{
			ClientID:     s.cfg.NotionClientID,
			ClientSecret: s.cfg.NotionClientSecret,
			Endpoint: oauth2.Endpoint{
				AuthURL:  "https://api.notion.com/v1/oauth/authorize",
				TokenURL: "https://api.notion.com/v1/oauth/token",
			},
			RedirectURL: s.cfg.NotionRedirectURL,
			Scopes:      s.cfg.NotionScopes,
		}

		// Register as OAuth2 provider (Notion doesn't support OIDC)
		s.registry.RegisterOAuth2Provider("notion", notionConfig)
		log.Println("Notion OAuth provider registered")
	} else {
		log.Println("Warning: Notion OAuth not configured. Set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET to enable.")
	}

	return nil
}

// setupRoutes configures all HTTP routes.
func (s *Server) setupRoutes() {
	// Auth endpoints
	s.mux.HandleFunc("/auth/login/anon", endpoint.HandleFunc(s.handleAnonLogin, s.sessionProcessor))
	s.mux.HandleFunc("/auth/logout", endpoint.HandleFunc(s.handleLogout, s.sessionProcessor))
	s.mux.HandleFunc("/auth/me", endpoint.HandleFunc(s.handleMe, s.sessionProcessor))

	// Notion OAuth endpoints (only if configured)
	if s.cfg.NotionClientID != "" {
		s.mux.HandleFunc("/auth/login/notion", endpoint.HandleFunc(s.handleNotionLogin, s.sessionProcessor))
		s.mux.HandleFunc("/auth/callback/notion", endpoint.HandleFunc(s.handleNotionCallback, s.sessionProcessor))
	}

	// Static file serving
	s.setupStaticServing()
}

// setupStaticServing configures static file serving for the frontend SPA.
func (s *Server) setupStaticServing() {
	// Check if frontend dist directory exists
	if _, err := os.Stat(s.cfg.FrontendDistDir); os.IsNotExist(err) {
		log.Printf("Warning: Frontend dist directory not found at %s. Static serving will not work.", s.cfg.FrontendDistDir)
		log.Println("You may need to build the frontend first.")

		// Add a simple redirect for root
		s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/" {
				http.Redirect(w, r, "/u", http.StatusFound)
				return
			}
			http.NotFound(w, r)
		})
		return
	}

	// Setup filesystem endpoint
	root := os.DirFS(s.cfg.FrontendDistDir)
	fsEndpoint := &endpoint.FileSystem{
		FS: func(ctx context.Context, r *http.Request) (fs.FS, error) {
			return root, nil
		},
		IndexHTML:        false, // We'll handle this manually for /u/* routes
		DirectoryListing: false,
	}

	// Root redirect: / -> /u
	s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			http.Redirect(w, r, "/u", http.StatusFound)
			return
		}

		// For paths that don't start with /u/, serve static files or return 404
		if !isUnderU(r.URL.Path) {
			// Try to serve as static file
			endpoint.HandleFunc(fsEndpoint.Endpoint)(w, r)
			return
		}

		// This shouldn't be reached for /u/* paths as they're handled below
		http.NotFound(w, r)
	})

	// SPA routes: /u and /u/* -> serve index.html
	s.mux.HandleFunc("/u", s.serveSPA)
	s.mux.HandleFunc("/u/", s.serveSPA)
}

// isUnderU checks if the path is under /u or /u/
func isUnderU(path string) bool {
	return path == "/u" || len(path) > 2 && path[:3] == "/u/"
}

// serveSPA serves the index.html file for SPA routes.
func (s *Server) serveSPA(w http.ResponseWriter, r *http.Request) {
	// Serve index.html for all /u/* routes
	indexPath := s.cfg.FrontendDistDir + "/index.html"
	http.ServeFile(w, r, indexPath)
}

// Handler returns the configured HTTP handler.
func (s *Server) Handler() http.Handler {
	return s.mux
}

// ListenAndServe starts the HTTP server.
func (s *Server) ListenAndServe() error {
	addr := fmt.Sprintf("%s:%s", s.cfg.Host, s.cfg.Port)
	log.Printf("Server starting on %s...", addr)
	return http.ListenAndServe(addr, s.mux)
}

// Auth endpoint handlers

// AnonLoginParams defines the parameters for anonymous login.
type AnonLoginParams struct {
	NextURL string `query:"next_url"`
}

// handleAnonLogin creates an anonymous session.
func (s *Server) handleAnonLogin(w http.ResponseWriter, r *http.Request, params AnonLoginParams) (endpoint.Renderer, error) {
	_, ok := middleware.SessionFromContext(r.Context())
	if !ok {
		// This shouldn't happen as sessionProcessor should create a session
		return nil, endpoint.Error(http.StatusInternalServerError, "session not available", nil)
	}

	// Session already exists (created by middleware), just redirect
	nextURL := ValidateNextURL(params.NextURL)
	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}

// LogoutParams defines the parameters for logout.
type LogoutParams struct {
	NextURL string `query:"next_url"`
}

// handleLogout clears the current session.
func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request, params LogoutParams) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())
	if ok {
		session.Logout()
	}

	nextURL := ValidateNextURL(params.NextURL)
	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}

// MeParams defines the parameters for the /auth/me endpoint.
type MeParams struct{}

// MeResponse defines the response for the /auth/me endpoint.
type MeResponse struct {
	LoggedIn bool   `json:"logged_in"`
	Username string `json:"username,omitempty"`
}

// handleMe returns the current session status.
func (s *Server) handleMe(w http.ResponseWriter, r *http.Request, params MeParams) (endpoint.Renderer, error) {
	response := MeResponse{
		LoggedIn: false,
	}

	session, ok := middleware.SessionFromContext(r.Context())
	if ok {
		if username, loggedIn := session.Username(); loggedIn {
			response.LoggedIn = true
			response.Username = username
		}
	}

	return &endpoint.JSONRenderer{Value: response}, nil
}

// NotionLoginParams defines the parameters for Notion login.
type NotionLoginParams struct {
	NextURL string `query:"next_url"`
}

// handleNotionLogin initiates the Notion OAuth flow.
func (s *Server) handleNotionLogin(w http.ResponseWriter, r *http.Request, params NotionLoginParams) (endpoint.Renderer, error) {
	// Require an existing session
	_, ok := middleware.SessionFromContext(r.Context())
	if !ok {
		return nil, endpoint.Error(http.StatusUnauthorized, "session required", nil)
	}

	provider, ok := s.registry.Get("notion")
	if !ok {
		return nil, endpoint.Error(http.StatusInternalServerError, "notion provider not configured", nil)
	}

	// Generate state for CSRF protection
	state := make([]byte, 16)
	if _, err := rand.Read(state); err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to generate state", err)
	}
	stateStr := fmt.Sprintf("%x", state)

	// Store state and next_url in session for verification in callback
	session, _ := middleware.SessionFromContext(r.Context())
	if err := session.Set("oauth_state", stateStr); err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to store state", err)
	}
	if err := session.Set("oauth_next_url", ValidateNextURL(params.NextURL)); err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to store next_url", err)
	}

	// Redirect to Notion OAuth authorization URL
	authURL := provider.Config().AuthCodeURL(stateStr)
	return &endpoint.RedirectRenderer{URL: authURL, Status: http.StatusFound}, nil
}

// NotionCallbackParams defines the parameters for Notion OAuth callback.
type NotionCallbackParams struct {
	Code  string `query:"code"`
	State string `query:"state"`
	Error string `query:"error"`
}

// handleNotionCallback handles the Notion OAuth callback.
func (s *Server) handleNotionCallback(w http.ResponseWriter, r *http.Request, params NotionCallbackParams) (endpoint.Renderer, error) {
	// Require an existing session
	session, ok := middleware.SessionFromContext(r.Context())
	if !ok || session == nil {
		return nil, endpoint.Error(http.StatusUnauthorized, "session required", nil)
	}

	// Check for OAuth error
	if params.Error != "" {
		log.Printf("OAuth error: %s", params.Error)
		return nil, endpoint.Error(http.StatusBadRequest, "oauth error: "+params.Error, nil)
	}

	// Verify state to prevent CSRF
	var storedState string
	if err := session.Get("oauth_state", &storedState); err != nil || storedState != params.State {
		return nil, endpoint.Error(http.StatusBadRequest, "invalid state parameter", nil)
	}

	// Get next URL from session
	nextURL := "/u"
	var storedNextURL string
	if err := session.Get("oauth_next_url", &storedNextURL); err == nil {
		nextURL = storedNextURL
	}

	// Clean up OAuth state from session
	session.Delete("oauth_state")
	session.Delete("oauth_next_url")

	provider, ok := s.registry.Get("notion")
	if !ok {
		return nil, endpoint.Error(http.StatusInternalServerError, "notion provider not configured", nil)
	}

	// Exchange authorization code for access token
	ctx := context.Background()
	token, err := provider.Config().Exchange(ctx, params.Code)
	if err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to exchange token", err)
	}

	// Store token in session
	if err := session.Set("notion_access_token", token.AccessToken); err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to store access token", err)
	}
	if token.RefreshToken != "" {
		if err := session.Set("notion_refresh_token", token.RefreshToken); err != nil {
			return nil, endpoint.Error(http.StatusInternalServerError, "failed to store refresh token", err)
		}
	}

	// For now, we'll use a placeholder username. In a real app, we'd fetch user info from Notion API.
	// The Notion API requires the access token to get user info.
	if err := session.Login("notion_user"); err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to login", err)
	}

	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}
