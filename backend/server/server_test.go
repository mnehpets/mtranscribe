package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mnehpets/mtranscribe/backend/config"
)

// TestServerCreation tests that the server can be created successfully.
func TestServerCreation(t *testing.T) {
	sessionKey := make([]byte, 32)
	copy(sessionKey, []byte("test-key-for-testing-purposes"))

	cfg := &config.Config{
		Port:            "8080",
		Host:            "",
		SessionKey:      sessionKey,
		SecureCookie:    false,
		FrontendDistDir: "/nonexistent",
	}

	srv, err := New(cfg)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	if srv == nil {
		t.Fatal("Expected non-nil server")
	}

	if srv.Handler() == nil {
		t.Fatal("Expected non-nil handler")
	}
}

// TestRootRedirect tests that the root path redirects to /u.
func TestRootRedirect(t *testing.T) {
	sessionKey := make([]byte, 32)
	copy(sessionKey, []byte("test-key-for-testing-purposes"))

	cfg := &config.Config{
		Port:            "8080",
		Host:            "",
		SessionKey:      sessionKey,
		SecureCookie:    false,
		FrontendDistDir: "/nonexistent",
	}

	srv, err := New(cfg)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()

	srv.Handler().ServeHTTP(w, req)

	if w.Code != http.StatusFound {
		t.Errorf("Expected status %d, got %d", http.StatusFound, w.Code)
	}

	location := w.Header().Get("Location")
	if location != "/u" {
		t.Errorf("Expected redirect to /u, got %s", location)
	}
}

// TestNotionProviderRegistration tests that Notion OAuth provider is registered when configured.
func TestNotionProviderRegistration(t *testing.T) {
	sessionKey := make([]byte, 32)
	copy(sessionKey, []byte("test-key-for-testing-purposes"))

	cfg := &config.Config{
		Port:               "8080",
		Host:               "",
		NotionClientID:     "test_client_id",
		NotionClientSecret: "test_client_secret",
		NotionRedirectURL:  "http://localhost:8080/auth/callback/notion",
		SessionKey:         sessionKey,
		SecureCookie:       false,
		FrontendDistDir:    "/nonexistent",
	}

	srv, err := New(cfg)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	// Check that the Notion provider is registered
	provider, ok := srv.registry.Get("notion")
	if !ok {
		t.Fatal("Expected Notion provider to be registered")
	}

	if provider == nil {
		t.Fatal("Expected non-nil provider")
	}

	if provider.ID() != "notion" {
		t.Errorf("Expected provider ID to be 'notion', got %s", provider.ID())
	}
}
