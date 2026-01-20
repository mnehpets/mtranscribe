package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func setupTestServer(t *testing.T) *Server {
	t.Helper()
	
	cfg := &Config{
		Port:               "8080",
		SessionKey:         "12345678901234567890123456789012", // Exactly 32 bytes
		NotionClientID:     "",                                  // No Notion for basic tests
		NotionClientSecret: "",
		PublicURL:          "http://localhost:8080",
		FrontendPath:       "testdata/frontend", // We'll create this
	}

	srv, err := New(cfg)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	return srv
}

func TestAuthMe_NoSession(t *testing.T) {
	srv := setupTestServer(t)

	req := httptest.NewRequest("GET", "/auth/me", nil)
	w := httptest.NewRecorder()

	srv.Handler().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if loggedIn, ok := response["logged_in"].(bool); !ok || loggedIn {
		t.Errorf("Expected logged_in to be false, got %v", response["logged_in"])
	}

	if hasNotion, ok := response["has_notion_credentials"].(bool); !ok || hasNotion {
		t.Errorf("Expected has_notion_credentials to be false, got %v", response["has_notion_credentials"])
	}
}

func TestLoginAnon(t *testing.T) {
	srv := setupTestServer(t)

	req := httptest.NewRequest("GET", "/auth/login/anon?next_url=/u/dashboard", nil)
	w := httptest.NewRecorder()

	srv.Handler().ServeHTTP(w, req)

	if w.Code != http.StatusFound {
		t.Errorf("Expected status 302, got %d", w.Code)
	}

	location := w.Header().Get("Location")
	if location != "/u/dashboard" {
		t.Errorf("Expected redirect to /u/dashboard, got %s", location)
	}

	// Check that session cookie was set
	cookies := w.Result().Cookies()
	var sessionCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "OSS" { // Default session cookie name
			sessionCookie = c
			break
		}
	}

	if sessionCookie == nil {
		t.Error("Expected session cookie to be set")
	}
}

func TestLoginAnon_InvalidNextURL(t *testing.T) {
	srv := setupTestServer(t)

	tests := []struct {
		name     string
		nextURL  string
		expected string
	}{
		{
			name:     "empty next_url",
			nextURL:  "",
			expected: "/u",
		},
		{
			name:     "external URL",
			nextURL:  "https://evil.com",
			expected: "/u",
		},
		{
			name:     "path not starting with /u/",
			nextURL:  "/admin",
			expected: "/u",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/auth/login/anon"
			if tt.nextURL != "" {
				url += "?next_url=" + tt.nextURL
			}

			req := httptest.NewRequest("GET", url, nil)
			w := httptest.NewRecorder()

			srv.Handler().ServeHTTP(w, req)

			if w.Code != http.StatusFound {
				t.Errorf("Expected status 302, got %d", w.Code)
			}

			location := w.Header().Get("Location")
			if location != tt.expected {
				t.Errorf("Expected redirect to %s, got %s", tt.expected, location)
			}
		})
	}
}

func TestLogout(t *testing.T) {
	srv := setupTestServer(t)

	// First, create a session by logging in anonymously
	loginReq := httptest.NewRequest("GET", "/auth/login/anon?next_url=/u/", nil)
	loginW := httptest.NewRecorder()
	srv.Handler().ServeHTTP(loginW, loginReq)

	// Get the session cookie
	var sessionCookie *http.Cookie
	for _, c := range loginW.Result().Cookies() {
		if c.Name == "OSS" {
			sessionCookie = c
			break
		}
	}

	if sessionCookie == nil {
		t.Fatal("Failed to create session")
	}

	// Now logout
	logoutReq := httptest.NewRequest("GET", "/auth/logout?next_url=/", nil)
	logoutReq.AddCookie(sessionCookie)
	logoutW := httptest.NewRecorder()

	srv.Handler().ServeHTTP(logoutW, logoutReq)

	if logoutW.Code != http.StatusFound {
		t.Errorf("Expected status 302, got %d", logoutW.Code)
	}

	location := logoutW.Header().Get("Location")
	if location != "/" {
		t.Errorf("Expected redirect to /, got %s", location)
	}

	// Check that the session cookie was cleared
	cookies := logoutW.Result().Cookies()
	var clearedCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "OSS" {
			clearedCookie = c
			break
		}
	}

	// Cookie should be set with MaxAge to expire it
	if clearedCookie == nil {
		t.Error("Expected session cookie to be cleared")
	}
}

func TestAuthMe_WithSession(t *testing.T) {
	srv := setupTestServer(t)

	// First, create a session
	loginReq := httptest.NewRequest("GET", "/auth/login/anon?next_url=/u/", nil)
	loginW := httptest.NewRecorder()
	srv.Handler().ServeHTTP(loginW, loginReq)

	var sessionCookie *http.Cookie
	for _, c := range loginW.Result().Cookies() {
		if c.Name == "OSS" {
			sessionCookie = c
			break
		}
	}

	if sessionCookie == nil {
		t.Fatal("Failed to create session")
	}

	// Now check /auth/me with session
	meReq := httptest.NewRequest("GET", "/auth/me", nil)
	meReq.AddCookie(sessionCookie)
	meW := httptest.NewRecorder()

	srv.Handler().ServeHTTP(meW, meReq)

	if meW.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", meW.Code)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(meW.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if loggedIn, ok := response["logged_in"].(bool); !ok || !loggedIn {
		t.Errorf("Expected logged_in to be true, got %v", response["logged_in"])
	}

	if sessionID, ok := response["session_id"].(string); !ok || sessionID == "" {
		t.Errorf("Expected session_id to be present, got %v", response["session_id"])
	}
}
