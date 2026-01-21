package server_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/mnehpets/mtranscribe/backend/server"
)

func setupTestServer(t *testing.T) *server.Server {
	t.Helper()

	cfg := &server.Config{
		Port:               "8080",
		SessionKey:         "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		NotionClientID:     "test_client_id",
		NotionClientSecret: "test_client_secret",
		PublicURL:          "http://localhost:8080",
		FrontendDir:        "../../frontend/dist",
	}

	srv, err := server.New(cfg)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	return srv
}

func TestSessionManagement_AnonymousLogin(t *testing.T) {
	srv := setupTestServer(t)
	ts := httptest.NewServer(http.Handler(srv))
	defer ts.Close()

	// Test anonymous login with redirect
	req, err := http.NewRequest("GET", ts.URL+"/auth/login/anon?next_url=/u/dashboard", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Don't follow redirects so we can verify the redirect URL
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	resp, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	// Should redirect to /u/dashboard
	if resp.StatusCode != http.StatusFound {
		t.Errorf("Expected status 302, got %d", resp.StatusCode)
	}

	location := resp.Header.Get("Location")
	if location != "/u/dashboard" {
		t.Errorf("Expected redirect to /u/dashboard, got %s", location)
	}

	// Should set a session cookie
	cookies := resp.Cookies()
	var sessionCookie *http.Cookie
	for _, cookie := range cookies {
		if cookie.Name == "OSS" { // DefaultCookieName from oneserve
			sessionCookie = cookie
			break
		}
	}

	if sessionCookie == nil {
		t.Error("Expected session cookie 'OSS' to be set")
	}

	if sessionCookie != nil && sessionCookie.Value == "" {
		t.Error("Session cookie value should not be empty")
	}
}

func TestSessionManagement_AnonymousLoginInvalidRedirect(t *testing.T) {
	srv := setupTestServer(t)
	ts := httptest.NewServer(http.Handler(srv))
	defer ts.Close()

	tests := []struct {
		name     string
		nextURL  string
		expected string
	}{
		{
			name:     "Absolute URL",
			nextURL:  "https://evil.com",
			expected: "/u/",
		},
		{
			name:     "Protocol-relative URL",
			nextURL:  "//evil.com/path",
			expected: "/u/",
		},
		{
			name:     "Path not starting with /u/",
			nextURL:  "/admin",
			expected: "/u/",
		},
	}

	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", ts.URL+"/auth/login/anon?next_url="+tt.nextURL, nil)
			if err != nil {
				t.Fatal(err)
			}

			resp, err := client.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()

			location := resp.Header.Get("Location")
			if location != tt.expected {
				t.Errorf("Expected redirect to %s, got %s", tt.expected, location)
			}
		})
	}
}

func TestSessionManagement_Logout(t *testing.T) {
	srv := setupTestServer(t)
	ts := httptest.NewServer(http.Handler(srv))
	defer ts.Close()

	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	// First, log in anonymously
	req, _ := http.NewRequest("GET", ts.URL+"/auth/login/anon?next_url=/u/", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	// Get the session cookie
	var sessionCookie *http.Cookie
	for _, cookie := range resp.Cookies() {
		if cookie.Name == "OSS" {
			sessionCookie = cookie
			break
		}
	}

	if sessionCookie == nil {
		t.Fatal("Expected session cookie to be set after login")
	}

	// Now log out - with "/" it should redirect to "/u/" since we use ValidateNextURL
	req, _ = http.NewRequest("GET", ts.URL+"/auth/logout?next_url=/", nil)
	req.AddCookie(sessionCookie)
	resp, err = client.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		t.Errorf("Expected status 302, got %d", resp.StatusCode)
	}

	location := resp.Header.Get("Location")
	if location != "/u/" {
		t.Errorf("Expected redirect to /u/, got %s", location)
	}

	// Check that session cookie was cleared
	var clearedCookie *http.Cookie
	for _, cookie := range resp.Cookies() {
		if cookie.Name == "OSS" {
			clearedCookie = cookie
			break
		}
	}

	// Cookie should be present but with MaxAge set to delete it
	if clearedCookie == nil {
		t.Error("Expected session cookie to be present in logout response")
	}
}

func TestSessionManagement_Me(t *testing.T) {
	srv := setupTestServer(t)
	ts := httptest.NewServer(http.Handler(srv))
	defer ts.Close()

	client := &http.Client{}

	t.Run("Not logged in", func(t *testing.T) {
		req, _ := http.NewRequest("GET", ts.URL+"/auth/me", nil)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("Expected status 200, got %d", resp.StatusCode)
		}

		// Response should indicate not logged in
		// We'll check the JSON response contains "logged_in": false
		body := make([]byte, 1024)
		n, _ := resp.Body.Read(body)
		bodyStr := string(body[:n])

		if !strings.Contains(bodyStr, `"logged_in":false`) {
			t.Errorf("Expected logged_in to be false, got: %s", bodyStr)
		}
	})

	t.Run("Logged in anonymously", func(t *testing.T) {
		client := &http.Client{
			CheckRedirect: func(req *http.Request, via []*http.Request) error {
				return http.ErrUseLastResponse
			},
		}

		// First log in
		req, _ := http.NewRequest("GET", ts.URL+"/auth/login/anon?next_url=/u/", nil)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()

		var sessionCookie *http.Cookie
		for _, cookie := range resp.Cookies() {
			if cookie.Name == "OSS" {
				sessionCookie = cookie
				break
			}
		}

		// Now check /auth/me with the session cookie
		req, _ = http.NewRequest("GET", ts.URL+"/auth/me", nil)
		req.AddCookie(sessionCookie)
		
		client2 := &http.Client{}
		resp, err = client2.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()

		body := make([]byte, 1024)
		n, _ := resp.Body.Read(body)
		bodyStr := string(body[:n])

		if !strings.Contains(bodyStr, `"logged_in":true`) {
			t.Errorf("Expected logged_in to be true, got: %s", bodyStr)
		}

		if !strings.Contains(bodyStr, `"has_notion_token":false`) {
			t.Errorf("Expected has_notion_token to be false, got: %s", bodyStr)
		}
	})
}
