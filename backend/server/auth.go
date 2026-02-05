package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"github.com/mnehpets/oneserve/auth"
	"github.com/mnehpets/oneserve/endpoint"
	"github.com/mnehpets/oneserve/middleware"
	"golang.org/x/oauth2"
)

var notionURLBase = "https://api.notion.com/v1/oauth/"

const notionAuthSuffix = "authorize"
const notionTokenSuffix = "token"

// setNotionURLBase sets the Notion API base URL for testing purposes.
// This is primarily used in integration tests to point to a mock OAuth server.
// Returns the original URL for restoration purposes.
func setNotionURLBase(url string) string {
	original := notionURLBase
	notionURLBase = url
	return original
}

// NotionToken stores the Notion OAuth tokens in the session.
type NotionToken struct {
	AccessToken  string `cbor:"1,keyasint"`
	RefreshToken string `cbor:"2,keyasint,omitempty"`
	Expiry       int64  `cbor:"3,keyasint,omitempty"` // Unix timestamp
}

// setupNotionAuth configures the Notion OAuth provider and auth handler.
func setupNotionAuth(cfg *Config, sessionKey []byte, secureCookies bool, processors []endpoint.Processor) (http.Handler, error) {
	registry := auth.NewRegistry()

	// Notion OAuth2 endpoint
	notionEndpoint := oauth2.Endpoint{
		AuthURL:  notionURLBase + notionAuthSuffix,
		TokenURL: notionURLBase + notionTokenSuffix,
	}

	// Notion OAuth2 config
	// Per spec: "the server MUST NOT include a `scope` parameter"
	// We explicitly set Scopes to empty slice to make this requirement clear
	notionConfig := &oauth2.Config{
		ClientID:     cfg.NotionClientID,
		ClientSecret: cfg.NotionClientSecret,
		Endpoint:     notionEndpoint,
		RedirectURL:  cfg.PublicURL + "/auth/callback/notion",
		Scopes:       []string{}, // Explicitly empty - Notion permissions are set in Notion Portal
	}

	// Register Notion as a non-OIDC OAuth2 provider
	registry.RegisterOAuth2Provider("notion", notionConfig)

	// Create auth handler
	handler, err := auth.NewHandler(
		registry,
		auth.DefaultCookieName, // "osa"
		"key1",
		map[string][]byte{"key1": sessionKey},
		cfg.PublicURL,
		"/auth",
		auth.WithPreAuthHook(preAuthHook),
		auth.WithResultEndpoint(authResultEndpoint),
		auth.WithProcessors(processors...),
		auth.WithCookieOptions(
			middleware.WithSecure(secureCookies),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create auth handler: %w", err)
	}

	return handler, nil
}

// preAuthHook ensures the user has an active session before starting OAuth flow.
func preAuthHook(ctx context.Context, w http.ResponseWriter, r *http.Request, providerID string, params auth.AuthParams) (auth.AuthParams, error) {
	// Check if user has an active session
	session, ok := middleware.SessionFromContext(ctx)
	if !ok {
		return params, endpoint.Error(http.StatusUnauthorized, "session required", nil)
	}

	// Use Username() to determine if user is logged in
	if _, loggedIn := session.Username(); !loggedIn {
		return params, endpoint.Error(http.StatusUnauthorized, "session required", nil)
	}

	// Validate next_url
	params.NextURL = ValidateNextURL(params.NextURL)

	return params, nil
}

// authResultEndpoint handles the OAuth callback result (success or failure).
func authResultEndpoint(w http.ResponseWriter, r *http.Request, result *auth.AuthResult) (endpoint.Renderer, error) {
	// Determine NextURL
	nextURL := "/u/"
	if result.AuthParams != nil && result.AuthParams.NextURL != "" {
		nextURL = result.AuthParams.NextURL
	}
	nextURL = ValidateNextURL(nextURL)

	// Handle success logic if no error occurred
	if result.Error == nil {
		// Verify user still has an active session
		session, ok := middleware.SessionFromContext(r.Context())
		if !ok {
			return nil, endpoint.Error(http.StatusUnauthorized, "session required", nil)
		}

		// Use Username() to determine if user is logged in
		if _, loggedIn := session.Username(); !loggedIn {
			return nil, endpoint.Error(http.StatusUnauthorized, "session required", nil)
		}

		// Store Notion token in session
		notionToken := NotionToken{
			AccessToken: result.Token.AccessToken,
		}
		if result.Token.RefreshToken != "" {
			notionToken.RefreshToken = result.Token.RefreshToken
		}
		if !result.Token.Expiry.IsZero() {
			notionToken.Expiry = result.Token.Expiry.Unix()
		}

		if err := session.Set("notion_token", notionToken); err != nil {
			return nil, endpoint.Error(http.StatusInternalServerError, "failed to store token", err)
		}
	}

	// Update URL with result status (success or failure)
	if u, err := url.Parse(nextURL); err == nil {
		q := u.Query()
		if result.Error != nil {
			q.Set("success", "false")
			var providerErr *auth.ProviderError
			if errors.As(result.Error, &providerErr) {
				q.Set("error", providerErr.Code)
				q.Set("error_description", providerErr.Description)
			} else {
				q.Set("error", "client_error")
				q.Set("error_description", result.Error.Error())
			}
		} else {
			q.Set("success", "true")
		}
		u.RawQuery = q.Encode()
		nextURL = u.String()
	}

	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}

// loginAnonEndpoint creates an anonymous session.
func loginAnonEndpoint(w http.ResponseWriter, r *http.Request, params struct {
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

	// Validate and redirect
	nextURL := ValidateNextURL(params.NextURL)
	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}

// logoutEndpoint destroys the current session.
func logoutEndpoint(w http.ResponseWriter, r *http.Request, params struct {
	NextURL string `query:"next_url"`
}) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())
	if ok {
		session.Logout()
	}

	// Use the same ValidateNextURL code as login
	nextURL := ValidateNextURL(params.NextURL)

	return &endpoint.RedirectRenderer{URL: nextURL, Status: http.StatusFound}, nil
}

// meEndpoint returns the current session status.
func meEndpoint(w http.ResponseWriter, r *http.Request, _ struct{}) (endpoint.Renderer, error) {
	session, ok := middleware.SessionFromContext(r.Context())

	response := map[string]interface{}{
		"logged_in": false,
		"services":  []string{},
	}

	if ok {
		// Use Username() to determine if user is logged in
		if _, loggedIn := session.Username(); loggedIn {
			response["logged_in"] = true
			response["session_id"] = session.ID()

			services := []string{}
			// Check if Notion token exists
			var notionToken NotionToken
			if err := session.Get("notion_token", &notionToken); err == nil && notionToken.AccessToken != "" {
				services = append(services, "notion")
			}
			response["services"] = services

			// Include username if present (don't check for empty string)
			if username, _ := session.Username(); username != "" {
				response["username"] = username
			}
		}
	}

	return &endpoint.JSONRenderer{Value: response}, nil
}
