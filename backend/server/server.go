package server

import (
	"context"
	"encoding/hex"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/mnehpets/oneserve/auth"
	"github.com/mnehpets/oneserve/endpoint"
	"github.com/mnehpets/oneserve/middleware"
	"golang.org/x/oauth2"
)

// NotionToken stores the Notion OAuth tokens in the session.
type NotionToken struct {
	AccessToken  string `cbor:"1,keyasint"`
	RefreshToken string `cbor:"2,keyasint,omitempty"`
	Expiry       int64  `cbor:"3,keyasint,omitempty"` // Unix timestamp
}

// Server encapsulates the HTTP server and its dependencies.
type Server struct {
	cfg              *Config
	sessionProcessor endpoint.Processor
	authHandler      http.Handler
	mux              *http.ServeMux
}

// New creates a new Server instance with the given configuration.
func New(cfg *Config) (*Server, error) {
	s := &Server{
		cfg: cfg,
		mux: http.NewServeMux(),
	}

	// Decode session key from hex
	sessionKey, err := hex.DecodeString(cfg.SessionKey)
	if err != nil {
		return nil, fmt.Errorf("invalid session key: %w", err)
	}
	if len(sessionKey) != 32 {
		return nil, fmt.Errorf("session key must be 32 bytes (64 hex characters), got %d bytes", len(sessionKey))
	}

	// Setup session middleware with CSRF protection (SameSite=Lax)
	s.sessionProcessor, err = middleware.NewSessionProcessor(
		middleware.DefaultCookieName, // "OSS"
		"key1",
		map[string][]byte{"key1": sessionKey},
		middleware.WithCookieOptions("/", "", false, true, http.SameSiteLaxMode), // secure=false for local dev
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create session processor: %w", err)
	}

	// Setup Notion OAuth
	if err := s.setupNotionAuth(); err != nil {
		return nil, fmt.Errorf("failed to setup Notion auth: %w", err)
	}

	// Setup routes
	s.setupRoutes()

	return s, nil
}

// setupNotionAuth configures the Notion OAuth provider and auth handler.
func (s *Server) setupNotionAuth() error {
	registry := auth.NewRegistry()

	// Notion OAuth2 endpoint
	notionEndpoint := oauth2.Endpoint{
		AuthURL:  "https://api.notion.com/v1/oauth/authorize",
		TokenURL: "https://api.notion.com/v1/oauth/token",
	}

	// Notion OAuth2 config
	// Per spec: "the server MUST NOT include a `scope` parameter"
	notionConfig := &oauth2.Config{
		ClientID:     s.cfg.NotionClientID,
		ClientSecret: s.cfg.NotionClientSecret,
		Endpoint:     notionEndpoint,
		RedirectURL:  s.cfg.PublicURL + "/auth/callback/notion",
		Scopes:       nil, // No scopes for Notion
	}

	// Register Notion as a non-OIDC OAuth2 provider
	registry.RegisterOAuth2Provider("notion", notionConfig)

	// Create auth state cookie (separate from session cookie)
	authCookie, err := middleware.NewCustomSecureCookie[auth.AuthStateMap](
		auth.DefaultCookieName, // "osa"
		"key1",
		map[string][]byte{"key1": mustDecodeHex(s.cfg.SessionKey)},
		nil, nil, // use default cbor marshal
		middleware.WithCookieOptions("/auth", "", false, true, http.SameSiteLaxMode),
	)
	if err != nil {
		return fmt.Errorf("failed to create auth cookie: %w", err)
	}

	// Create auth handler
	s.authHandler = auth.NewHandler(
		registry,
		authCookie,
		s.cfg.PublicURL,
		"/auth",
		auth.WithPreAuthHook(s.preAuthHook),
		auth.WithSuccessEndpoint(s.authSuccessEndpoint),
		auth.WithProcessors(s.sessionProcessor),
	)

	return nil
}

// preAuthHook ensures the user has an active session before starting OAuth flow.
func (s *Server) preAuthHook(ctx context.Context, w http.ResponseWriter, r *http.Request, providerID string, params auth.AuthParams) (auth.AuthParams, error) {
	// Check if user has an active session
	session, ok := middleware.SessionFromContext(ctx)
	if !ok || session.ID() == "" {
		return params, endpoint.Error(http.StatusUnauthorized, "session required", nil)
	}

	// Validate next_url
	params.NextURL = ValidateNextURL(params.NextURL)

	return params, nil
}

// authSuccessEndpoint handles successful OAuth callback.
func (s *Server) authSuccessEndpoint(w http.ResponseWriter, r *http.Request, params *auth.SuccessParams) (endpoint.Renderer, error) {
	// Verify user still has an active session
	session, ok := middleware.SessionFromContext(r.Context())
	if !ok || session.ID() == "" {
		return nil, endpoint.Error(http.StatusUnauthorized, "session required", nil)
	}

	// Store Notion token in session
	notionToken := NotionToken{
		AccessToken: params.Token.AccessToken,
	}
	if params.Token.RefreshToken != "" {
		notionToken.RefreshToken = params.Token.RefreshToken
	}
	if !params.Token.Expiry.IsZero() {
		notionToken.Expiry = params.Token.Expiry.Unix()
	}

	if err := session.Set("notion_token", notionToken); err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to store token", err)
	}

	log.Printf("Notion OAuth successful for session %s", session.ID())

	// Redirect to next_url or default
	nextURL := ValidateNextURL(params.NextURL)
	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}

// setupRoutes configures all HTTP routes.
func (s *Server) setupRoutes() {
	// Auth routes (managed by auth handler)
	s.mux.Handle("/auth/", s.authHandler)

	// Session management routes (override auth handler for these specific paths)
	s.mux.Handle("GET /auth/login/anon", endpoint.HandleFunc(s.loginAnonEndpoint, s.sessionProcessor))
	s.mux.Handle("GET /auth/logout", endpoint.HandleFunc(s.logoutEndpoint, s.sessionProcessor))
	s.mux.Handle("GET /auth/me", endpoint.HandleFunc(s.meEndpoint, s.sessionProcessor))

	// Static file serving - use a catch-all that won't conflict
	s.mux.HandleFunc("/", endpoint.HandleFunc(s.fileSystemEndpoint))
}

// loginAnonEndpoint creates an anonymous session.
func (s *Server) loginAnonEndpoint(w http.ResponseWriter, r *http.Request, params struct {
	NextURL string `query:"next_url"`
}) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())
	if !ok {
		return nil, endpoint.Error(http.StatusInternalServerError, "session not found", nil)
	}

	// Create new anonymous session (empty username)
	if err := session.Login(""); err != nil {
		return nil, endpoint.Error(http.StatusInternalServerError, "failed to create session", err)
	}

	log.Printf("Anonymous login: session %s", session.ID())

	// Validate and redirect
	nextURL := ValidateNextURL(params.NextURL)
	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}

// logoutEndpoint destroys the current session.
func (s *Server) logoutEndpoint(w http.ResponseWriter, r *http.Request, params struct {
	NextURL string `query:"next_url"`
}) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())
	if ok {
		log.Printf("Logout: session %s", session.ID())
		session.Logout()
	}

	// Validate next_url - for logout, we accept "/" as well as "/u/*"
	nextURL := params.NextURL
	if nextURL == "" || nextURL == "/" {
		nextURL = "/"
	} else {
		nextURL = ValidateNextURL(nextURL)
	}
	
	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}

// meEndpoint returns the current session status.
func (s *Server) meEndpoint(w http.ResponseWriter, r *http.Request, _ struct{}) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())
	
	response := map[string]interface{}{
		"logged_in":          false,
		"has_notion_token":   false,
	}

	if ok && session.ID() != "" {
		response["logged_in"] = true
		response["session_id"] = session.ID()
		
		// Check if Notion token exists
		var notionToken NotionToken
		if err := session.Get("notion_token", &notionToken); err == nil && notionToken.AccessToken != "" {
			response["has_notion_token"] = true
		}
		
		// Include username if logged in with username
		if username, loggedIn := session.Username(); loggedIn && username != "" {
			response["username"] = username
		}
	}

	return &endpoint.JSONRenderer{Value: response}, nil
}

// fileSystemEndpoint serves static files and handles SPA routing.
func (s *Server) fileSystemEndpoint(w http.ResponseWriter, r *http.Request, _ struct{}) (endpoint.Renderer, error) {
	// Handle root redirect
	if r.URL.Path == "/" {
		return &endpoint.RedirectRenderer{URL: "/u", Status: http.StatusFound}, nil
	}

	// Create filesystem
	root := os.DirFS(s.cfg.FrontendDir)

	// For /u/* routes, serve index.html (SPA support)
	if r.URL.Path == "/u" || strings.HasPrefix(r.URL.Path, "/u/") {
		file, err := root.Open("index.html")
		if err != nil {
			return nil, endpoint.Error(http.StatusNotFound, "frontend not found", err)
		}

		return &endpoint.StaticFileRenderer{
			File: file,
		}, nil
	}

	// For other routes, try to serve the file directly
	fsEndpoint := &endpoint.FileSystem{
		FS: func(ctx context.Context, r *http.Request) (fs.FS, error) {
			return root, nil
		},
		IndexHTML:        false, // Don't auto-serve index.html for non-/u routes
		DirectoryListing: false,
	}

	// Extract path from URL
	path := strings.TrimPrefix(r.URL.Path, "/")
	params := endpoint.FileSystemParams{Path: path}
	
	return fsEndpoint.Endpoint(w, r, params)
}

// ListenAndServe starts the HTTP server.
func (s *Server) ListenAndServe() error {
	addr := ":" + s.cfg.Port
	log.Printf("Server starting on %s", addr)
	log.Printf("Public URL: %s", s.cfg.PublicURL)
	log.Printf("Frontend directory: %s", s.cfg.FrontendDir)
	return http.ListenAndServe(addr, s.mux)
}

// ServeHTTP implements http.Handler interface.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

// mustDecodeHex is a helper that panics on error (used during setup).
func mustDecodeHex(s string) []byte {
	b, err := hex.DecodeString(s)
	if err != nil {
		panic(err)
	}
	return b
}
