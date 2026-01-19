package server

import (
	"context"
	"crypto/rand"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/mnehpets/mtranscribe/backend/config"
	"github.com/mnehpets/oneserve/auth"
	"github.com/mnehpets/oneserve/endpoint"
	"github.com/mnehpets/oneserve/middleware"
	"golang.org/x/oauth2"
)

// NotionCredentials holds the OAuth credentials for Notion.
type NotionCredentials struct {
	AccessToken  string    `cbor:"1,keyasint"`
	RefreshToken string    `cbor:"2,keyasint,omitempty"`
	Expiry       time.Time `cbor:"3,keyasint,omitempty"`
}

// Server encapsulates the HTTP server and its dependencies.
type Server struct {
	cfg              *config.Config
	sessionProcessor endpoint.Processor
	authCookie       middleware.SecureCookie[auth.AuthStateMap]
	registry         *auth.Registry
	authHandler      *auth.AuthHandler
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

		// Create auth state cookie (separate from session cookie)
		var err error
		s.authCookie, err = middleware.NewCustomSecureCookie[auth.AuthStateMap](
			auth.DefaultCookieName,
			"key1",
			map[string][]byte{"key1": s.cfg.SessionKey},
			nil, nil, // use default CBOR marshal
			middleware.WithCookieOptions("/auth", "", s.cfg.SecureCookie, true, http.SameSiteLaxMode),
		)
		if err != nil {
			return fmt.Errorf("failed to create auth cookie: %w", err)
		}

		// Determine public URL (use redirect URL as base)
		publicURL := "http://localhost:8080"
		if s.cfg.NotionRedirectURL != "" {
			// Parse the redirect URL to get the base
			if len(s.cfg.NotionRedirectURL) > 0 {
				// Extract base URL from redirect URL (e.g., http://localhost:8080/auth/callback/notion -> http://localhost:8080)
				if idx := findNthChar(s.cfg.NotionRedirectURL, '/', 3); idx != -1 {
					publicURL = s.cfg.NotionRedirectURL[:idx]
				}
			}
		}

		// Create auth handler with success endpoint
		s.authHandler = auth.NewHandler(
			s.registry,
			s.authCookie,
			publicURL,
			"/auth",
			auth.WithSuccessEndpoint(s.handleAuthSuccess),
			auth.WithProcessors(s.sessionProcessor),
		)

		log.Println("Notion OAuth provider registered")
	} else {
		log.Println("Warning: Notion OAuth not configured. Set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET to enable.")
	}

	return nil
}

// findNthChar finds the index of the nth occurrence of a character in a string.
func findNthChar(s string, ch rune, n int) int {
	count := 0
	for i, c := range s {
		if c == ch {
			count++
			if count == n {
				return i
			}
		}
	}
	return -1
}

// handleAuthSuccess is called after successful OAuth authentication.
func (s *Server) handleAuthSuccess(w http.ResponseWriter, r *http.Request, params *auth.SuccessParams) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())
	if !ok {
		return nil, endpoint.Error(http.StatusInternalServerError, "session not found", nil)
	}

	// Store Notion credentials in session
	creds := NotionCredentials{
		AccessToken:  params.Token.AccessToken,
		RefreshToken: params.Token.RefreshToken,
	}
	if !params.Token.Expiry.IsZero() {
		creds.Expiry = params.Token.Expiry
	}

	if err := session.Set("notion_creds", creds); err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to store credentials", err)
	}

	// Log in the user (use a placeholder username for now)
	if err := session.Login("notion_user"); err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to login", err)
	}

	// Redirect to next URL or default
	nextURL := ValidateNextURL(params.NextURL)
	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}

// setupRoutes configures all HTTP routes.
func (s *Server) setupRoutes() {
	// Auth endpoints
	s.mux.HandleFunc("/auth/login/anon", endpoint.HandleFunc(s.handleAnonLogin, s.sessionProcessor))
	s.mux.HandleFunc("/auth/logout", endpoint.HandleFunc(s.handleLogout, s.sessionProcessor))
	s.mux.HandleFunc("/auth/me", endpoint.HandleFunc(s.handleMe, s.sessionProcessor))

	// Mount Notion OAuth handler (if configured)
	if s.authHandler != nil {
		s.mux.Handle("/auth/", s.authHandler)
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
	LoggedIn    bool   `json:"logged_in"`
	Username    string `json:"username,omitempty"`
	NotionCreds bool   `json:"notion_creds"`
}

// handleMe returns the current session status.
func (s *Server) handleMe(w http.ResponseWriter, r *http.Request, params MeParams) (endpoint.Renderer, error) {
	response := MeResponse{
		LoggedIn:    false,
		NotionCreds: false,
	}

	session, ok := middleware.SessionFromContext(r.Context())
	if ok {
		if username, loggedIn := session.Username(); loggedIn {
			response.LoggedIn = true
			response.Username = username
		}

		// Check if Notion credentials are present
		var creds NotionCredentials
		if err := session.Get("notion_creds", &creds); err == nil && creds.AccessToken != "" {
			response.NotionCreds = true
		}
	}

	return &endpoint.JSONRenderer{Value: response}, nil
}
