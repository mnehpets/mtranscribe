package server

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/mnehpets/oneserve/endpoint"
	"github.com/mnehpets/oneserve/middleware"
)

// notionAPIURL is the base URL used by the Notion reverse proxy.
//
// It is a variable (not a const) so tests can override it to point at a mock
// Notion server.
var notionAPIURL = "https://api.notion.com"

// notionProxyEndpoint handles proxying requests to the Notion API.
func (s *Server) notionProxyEndpoint(w http.ResponseWriter, r *http.Request, _ struct{}) (endpoint.Renderer, error) {
	// 1. Check for session and authentication
	session, ok := middleware.SessionFromContext(r.Context())
	if !ok {
		return nil, endpoint.Error(http.StatusUnauthorized, "Unauthorized", nil)
	}

	if _, loggedIn := session.Username(); !loggedIn {
		return nil, endpoint.Error(http.StatusUnauthorized, "Unauthorized", nil)
	}

	// 2. Retrieve Notion token
	var notionToken NotionToken
	if err := session.Get("notion_token", &notionToken); err != nil || notionToken.AccessToken == "" {
		return nil, endpoint.Error(http.StatusUnauthorized, "Notion authentication required", nil)
	}

	// 3. Setup Reverse Proxy
	target, _ := url.Parse(notionAPIURL)
	proxy := httputil.NewSingleHostReverseProxy(target)

	// Custom Director to modify the request
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)

		// Set the Host header to the target host (required for TLS/SNI)
		req.Host = target.Host

		// Rewrite the path: remove /api/notion prefix
		// The frontend sends requests to /api/notion/v1/..., we want /v1/...
		req.URL.Path = strings.TrimPrefix(req.URL.Path, "/api/notion")
		req.URL.RawPath = strings.TrimPrefix(req.URL.RawPath, "/api/notion")

		// Inject Authorization header
		req.Header.Set("Authorization", "Bearer "+notionToken.AccessToken)
	}

	return &endpoint.ProxyRenderer{Proxy: proxy}, nil
}
