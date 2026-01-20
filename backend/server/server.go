package server

import (
	"context"
	"crypto/rand"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"

	"github.com/mnehpets/oneserve/auth"
	"github.com/mnehpets/oneserve/endpoint"
	"github.com/mnehpets/oneserve/middleware"
	"golang.org/x/oauth2"
)

// NotionToken holds the Notion OAuth tokens stored in the session.
type NotionToken struct {
	AccessToken  string `cbor:"1,keyasint"`
	RefreshToken string `cbor:"2,keyasint,omitempty"`
	Expiry       int64  `cbor:"3,keyasint,omitempty"` // Unix timestamp
}

const notionSessionKey = "notion_token"

// Server encapsulates the HTTP server and its dependencies.
type Server struct {
	config           *Config
	mux              *http.ServeMux
	sessionProcessor endpoint.Processor
	authHandler      *auth.AuthHandler
}

// New creates a new Server instance with all routes configured.
func New(cfg *Config) (*Server, error) {
	s := &Server{
		config: cfg,
		mux:    http.NewServeMux(),
	}

	// Generate or use session key
	sessionKey := []byte(cfg.SessionKey)
	if len(sessionKey) == 0 {
		sessionKey = make([]byte, 32)
		if _, err := rand.Read(sessionKey); err != nil {
			return nil, fmt.Errorf("failed to generate session key: %w", err)
		}
		log.Println("Warning: Using randomly generated session key. Set SESSION_KEY env var for persistence.")
	}

	// Setup session processor with SameSite=Lax for CSRF protection
	sessionProcessor, err := middleware.NewSessionProcessor(
		middleware.DefaultCookieName,
		"key1",
		map[string][]byte{"key1": sessionKey},
		middleware.WithCookieOptions("/", "", false, true, http.SameSiteLaxMode),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create session processor: %w", err)
	}
	s.sessionProcessor = sessionProcessor

	// Setup Notion OAuth if credentials are provided
	if cfg.NotionClientID != "" && cfg.NotionClientSecret != "" {
		if err := s.setupNotionAuth(); err != nil {
			return nil, fmt.Errorf("failed to setup Notion auth: %w", err)
		}
	} else {
		log.Println("Notion OAuth not configured (missing CLIENT_ID or CLIENT_SECRET)")
	}

	// Setup routes
	s.setupRoutes()

	return s, nil
}

// setupNotionAuth configures the Notion OAuth provider and auth handler.
func (s *Server) setupNotionAuth() error {
	// Create session key for auth state cookie
	sessionKey := []byte(s.config.SessionKey)
	if len(sessionKey) == 0 {
		sessionKey = make([]byte, 32)
		if _, err := rand.Read(sessionKey); err != nil {
			return fmt.Errorf("failed to generate session key: %w", err)
		}
	}

	// Setup auth state cookie
	authCookie, err := middleware.NewCustomSecureCookie[auth.AuthStateMap](
		auth.DefaultCookieName,
		"key1",
		map[string][]byte{"key1": sessionKey},
		nil, nil, // use default cbor marshal
		middleware.WithCookieOptions("/auth", "", false, true, http.SameSiteLaxMode),
	)
	if err != nil {
		return fmt.Errorf("failed to create auth cookie: %w", err)
	}

	// Create auth registry and register Notion as OAuth2 provider
	registry := auth.NewRegistry()
	
	// Notion OAuth2 configuration
	// Notion uses OAuth 2.0 but not OIDC, so we register it as an OAuth2 provider
	notionConfig := &oauth2.Config{
		ClientID:     s.config.NotionClientID,
		ClientSecret: s.config.NotionClientSecret,
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://api.notion.com/v1/oauth/authorize",
			TokenURL: "https://api.notion.com/v1/oauth/token",
		},
		RedirectURL: s.config.PublicURL + "/auth/callback/notion",
		Scopes:      s.config.NotionScopes,
	}
	registry.RegisterOAuth2Provider("notion", notionConfig)

	// Create auth handler with custom hooks
	s.authHandler = auth.NewHandler(
		registry,
		authCookie,
		s.config.PublicURL,
		"/auth",
		auth.WithPreAuthHook(s.preAuthHook),
		auth.WithSuccessEndpoint(s.successEndpoint),
		auth.WithProcessors(s.sessionProcessor),
	)

	return nil
}

// preAuthHook ensures user has a session before starting OAuth flow.
func (s *Server) preAuthHook(ctx context.Context, w http.ResponseWriter, r *http.Request, providerID string, params auth.AuthParams) (auth.AuthParams, error) {
	// Check if user has an active session
	session, ok := middleware.SessionFromContext(ctx)
	if !ok || session.ID() == "" {
		return params, fmt.Errorf("session required to initiate OAuth flow")
	}

	// Validate and sanitize next_url using our custom validation
	params.NextURL = ValidateNextURL(params.NextURL)
	return params, nil
}

// successEndpoint handles successful OAuth callback.
func (s *Server) successEndpoint(w http.ResponseWriter, r *http.Request, params *auth.SuccessParams) (endpoint.Renderer, error) {
	// Verify session still exists
	session, ok := middleware.SessionFromContext(r.Context())
	if !ok || session.ID() == "" {
		return nil, endpoint.Error(http.StatusUnauthorized, "session required", nil)
	}

	// Store Notion token in session
	if params.Token != nil {
		notionToken := NotionToken{
			AccessToken:  params.Token.AccessToken,
			RefreshToken: params.Token.RefreshToken,
		}
		if !params.Token.Expiry.IsZero() {
			notionToken.Expiry = params.Token.Expiry.Unix()
		}

		if err := session.Set(notionSessionKey, notionToken); err != nil {
			return nil, endpoint.Error(http.StatusInternalServerError, "failed to store token", err)
		}
	}

	// Redirect to NextURL or default
	target := ValidateNextURL(params.NextURL)
	return &endpoint.RedirectRenderer{URL: target, Status: http.StatusFound}, nil
}

// setupRoutes configures all HTTP routes.
func (s *Server) setupRoutes() {
	// Auth routes
	if s.authHandler != nil {
		s.mux.Handle("/auth/", s.authHandler)
	}

	// Anonymous login endpoint
	s.mux.HandleFunc("GET /auth/login/anon", endpoint.HandleFunc(s.loginAnonEndpoint, s.sessionProcessor))

	// Logout endpoint
	s.mux.HandleFunc("GET /auth/logout", endpoint.HandleFunc(s.logoutEndpoint, s.sessionProcessor))

	// Session status endpoint
	s.mux.HandleFunc("GET /auth/me", endpoint.HandleFunc(s.meEndpoint, s.sessionProcessor))

	// Static file serving
	s.setupStaticServing()
}

// loginAnonEndpoint handles anonymous login.
func (s *Server) loginAnonEndpoint(w http.ResponseWriter, r *http.Request, params struct {
	NextURL string `query:"next_url"`
}) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())
	if !ok {
		return nil, endpoint.Error(http.StatusInternalServerError, "session not available", nil)
	}

	// Create session if not exists by calling Login
	// For anonymous sessions, we use an empty username
	// Login() will create a new session with a random ID
	if session.ID() == "" {
		if err := session.Login(""); err != nil {
			return nil, endpoint.Error(http.StatusInternalServerError, "failed to create session", err)
		}
	}

	// Validate and redirect
	target := ValidateNextURL(params.NextURL)
	return &endpoint.RedirectRenderer{URL: target, Status: http.StatusFound}, nil
}

// logoutEndpoint handles logout.
func (s *Server) logoutEndpoint(w http.ResponseWriter, r *http.Request, params struct {
	NextURL string `query:"next_url"`
}) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())
	if ok && session.ID() != "" {
		if err := session.Logout(); err != nil {
			return nil, endpoint.Error(http.StatusInternalServerError, "logout failed", err)
		}
	}

	// Validate next_url - logout allows any path starting with /u/ or defaults to /
	var target string
	if params.NextURL != "" && len(params.NextURL) > 0 && params.NextURL[0] == '/' && !hasPrefix(params.NextURL, "//") {
		target = params.NextURL
	} else {
		target = "/"
	}
	
	return &endpoint.RedirectRenderer{URL: target, Status: http.StatusFound}, nil
}

// hasPrefix is a helper to check string prefix
func hasPrefix(s, prefix string) bool {
	return len(s) >= len(prefix) && s[:len(prefix)] == prefix
}

// meEndpoint returns session status.
func (s *Server) meEndpoint(w http.ResponseWriter, r *http.Request, params struct{}) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())
	
	response := map[string]interface{}{
		"logged_in":           false,
		"has_notion_credentials": false,
	}

	if ok && session.ID() != "" {
		response["logged_in"] = true
		response["session_id"] = session.ID()

		// Check if Notion credentials exist
		var token NotionToken
		if err := session.Get(notionSessionKey, &token); err == nil && token.AccessToken != "" {
			response["has_notion_credentials"] = true
		}

		// Check if user is authenticated (not anonymous)
		if username, authenticated := session.Username(); authenticated && username != "" {
			response["authenticated"] = true
			response["username"] = username
		}
	}

	return &endpoint.JSONRenderer{Value: response}, nil
}

// setupStaticServing configures static file serving for the frontend.
func (s *Server) setupStaticServing() {
	// Check if frontend path exists
	frontendFS := os.DirFS(s.config.FrontendPath)
	if _, err := fs.Stat(frontendFS, "."); err != nil {
		log.Printf("Warning: Frontend path %s does not exist or is not readable: %v", s.config.FrontendPath, err)
		// Create a simple fallback handler
		s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path == "/" {
				http.Redirect(w, r, "/u", http.StatusFound)
				return
			}
			http.NotFound(w, r)
		})
		return
	}

	// Redirect root to /u
	s.mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/u", http.StatusFound)
	})

	// Serve /u/* routes with index.html fallback (SPA support)
	fsEndpoint := &endpoint.FileSystem{
		FS: func(ctx context.Context, r *http.Request) (fs.FS, error) {
			return frontendFS, nil
		},
		IndexHTML:        true,
		DirectoryListing: false,
	}
	s.mux.HandleFunc("GET /u/{path...}", endpoint.HandleFunc(fsEndpoint.Endpoint))

	// Serve static assets directly (without /u prefix)
	s.mux.HandleFunc("GET /{path...}", endpoint.HandleFunc(fsEndpoint.Endpoint))
}

// Handler returns the http.Handler for the server.
func (s *Server) Handler() http.Handler {
	return s.mux
}

// ListenAndServe starts the HTTP server.
func (s *Server) ListenAndServe() error {
	addr := ":" + s.config.Port
	log.Printf("Server starting on %s", addr)
	log.Printf("Frontend path: %s", s.config.FrontendPath)
	log.Printf("Public URL: %s", s.config.PublicURL)
	return http.ListenAndServe(addr, s.mux)
}
