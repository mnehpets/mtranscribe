package server

import (
	"context"
	"encoding/base64"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/mnehpets/oneserve/endpoint"
	"github.com/mnehpets/oneserve/middleware"
)

// Server encapsulates the HTTP server and its dependencies.
type Server struct {
	cfg               *Config
	sessionProcessor  endpoint.Processor
	securityProcessor endpoint.Processor
	authHandler       http.Handler
	mux               *http.ServeMux
}

// New creates a new Server instance with the given configuration.
func New(cfg *Config) (*Server, error) {
	s := &Server{
		cfg: cfg,
		mux: http.NewServeMux(),
	}

	// Decode session key from base64url
	sessionKey, err := base64.URLEncoding.DecodeString(cfg.SessionKey)
	if err != nil {
		return nil, fmt.Errorf("invalid session key: %w", err)
	}
	if len(sessionKey) != 32 {
		return nil, fmt.Errorf("session key must be 32 bytes, got %d bytes", len(sessionKey))
	}

	// Determine if we should use secure cookies based on PUBLIC_URL scheme
	secureCookies := strings.HasPrefix(cfg.PublicURL, "https://")

	// Setup security headers middleware
	var securityOpts []middleware.SecurityHeadersOption
	if !secureCookies {
		securityOpts = append(securityOpts, middleware.WithoutHSTS())
	}

	// Configure CSP to allow unsafe-inline for scripts/styles (required for Vue/Vite),
	// and Deepgram API access.
	csp := "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self' https://api.deepgram.com wss://api.deepgram.com;"
	securityOpts = append(securityOpts, middleware.WithCSP(csp))

	// Relax Cross-Origin policies to allow popup authentication flows
	securityOpts = append(securityOpts, middleware.WithCrossOriginPolicies("same-origin-allow-popups", "", "same-origin"))

	s.securityProcessor = middleware.NewSecurityHeadersProcessor(securityOpts...)

	// Setup session middleware with CSRF protection (SameSite=Lax)
	s.sessionProcessor, err = middleware.NewSessionProcessor(
		"key1",
		map[string][]byte{"key1": sessionKey},
		middleware.WithCookieOptions(
			middleware.WithSecure(secureCookies),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create session processor: %w", err)
	}

	// Create common processors
	processors := []endpoint.Processor{s.securityProcessor, s.sessionProcessor}

	// Setup Notion OAuth
	authHandler, err := setupNotionAuth(cfg, sessionKey, secureCookies, processors)
	if err != nil {
		return nil, fmt.Errorf("failed to setup Notion auth: %w", err)
	}
	s.authHandler = authHandler

	// Setup routes
	s.setupRoutes(processors)

	return s, nil
}

// setupRoutes configures all HTTP routes.
func (s *Server) setupRoutes(processors []endpoint.Processor) {
	// Static file serving endpoints - register first with most specific patterns
	// 1. Root redirect
	s.mux.HandleFunc("GET /{$}", endpoint.HandleFunc(s.rootRedirectEndpoint, processors...))
	// 2. Frontend endpoint - always serves index.html for /u/*; /u will redirect to /u/
	s.mux.HandleFunc("GET /u/{path...}", endpoint.HandleFunc(s.frontendEndpoint, processors...))

	// Auth routes (managed by auth handler)
	s.mux.Handle("/auth/", s.authHandler)

	// Session management routes (override auth handler for these specific paths)
	s.mux.Handle("GET /auth/login/anon", endpoint.HandleFunc(loginAnonEndpoint, processors...))
	s.mux.Handle("GET /auth/logout", endpoint.HandleFunc(logoutEndpoint, processors...))
	s.mux.Handle("GET /auth/me", endpoint.HandleFunc(meEndpoint, processors...))

	// 3. File system endpoint - serves static assets (catch-all for everything else)
	s.mux.HandleFunc("/", endpoint.HandleFunc(s.fileSystemEndpoint, processors...))
}

// rootRedirectEndpoint redirects root to /u/ to avoid double redirect.
func (s *Server) rootRedirectEndpoint(w http.ResponseWriter, r *http.Request, _ struct{}) (endpoint.Renderer, error) {
	return &endpoint.RedirectRenderer{URL: "/u/", Status: http.StatusFound}, nil
}

// frontendEndpoint always serves index.html for frontend routes.
func (s *Server) frontendEndpoint(w http.ResponseWriter, r *http.Request, _ struct{}) (endpoint.Renderer, error) {
	root := os.DirFS(s.cfg.FrontendDir)
	file, err := root.Open("index.html")
	if err != nil {
		return nil, endpoint.Error(http.StatusNotFound, "frontend not found", err)
	}

	return &endpoint.StaticFileRenderer{
		File: file,
	}, nil
}

// fileSystemEndpoint serves static files (assets, etc).
func (s *Server) fileSystemEndpoint(w http.ResponseWriter, r *http.Request, _ struct{}) (endpoint.Renderer, error) {
	root := os.DirFS(s.cfg.FrontendDir)

	fsEndpoint := &endpoint.FileSystem{
		FS: func(ctx context.Context, r *http.Request) (fs.FS, error) {
			return root, nil
		},
		IndexHTML:        false,
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
