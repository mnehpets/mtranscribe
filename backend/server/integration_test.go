package server

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func setupTestServer(t *testing.T) *Server {
	t.Helper()

	cfg := &Config{
		Port:               "8080",
		SessionKey:         "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=",
		NotionClientID:     "test_client_id",
		NotionClientSecret: "test_client_secret",
		PublicURL:          "http://localhost:8080",
		FrontendDir:        "../../frontend/dist",
	}

	srv, err := New(cfg)
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
		{
			name:     "Empty URL",
			nextURL:  "",
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

		if !strings.Contains(bodyStr, `"services":[]`) {
			t.Errorf("Expected services to be empty, got: %s", bodyStr)
		}
	})
}

func TestNotionAuthFlow(t *testing.T) {
	// 1. Setup Mock OAuth Server
	mockOAuthServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/token" {
			if r.Method != "POST" {
				t.Errorf("Expected POST to /token, got %s", r.Method)
				http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
				return
			}
			w.Header().Set("Content-Type", "application/json")
			w.Write([]byte(`{
				"access_token": "mock_access_token",
				"token_type": "bearer",
				"expires_in": 3600,
				"workspace_id": "mock_workspace_id",
				"bot_id": "mock_bot_id"
			}`))
			return
		}
		// Allow any other path for authorize redirect if needed
		http.Error(w, "not found", http.StatusNotFound)
	}))
	defer mockOAuthServer.Close()

	// 2. Set the Notion URL base to point to the mock server
	originalNotionURLBase := setNotionURLBase(mockOAuthServer.URL + "/")
	defer func() {
		setNotionURLBase(originalNotionURLBase)
	}()

	// 3. Setup Server with Mock URLs
	cfg := &Config{
		Port:               "8080",
		SessionKey:         "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=",
		NotionClientID:     "test_client_id",
		NotionClientSecret: "test_client_secret",
		PublicURL:          "http://localhost:8080",
		FrontendDir:        "../../frontend/dist",
	}

	srv, err := New(cfg)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	ts := httptest.NewServer(http.Handler(srv))
	defer ts.Close()

	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
		Jar: jar,
	}

	// 3. Anonymous Login to get Session
	loginReq, _ := http.NewRequest("GET", ts.URL+"/auth/login/anon?next_url=/u/dashboard", nil)
	resp, err := client.Do(loginReq)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		t.Fatalf("Expected 302 Found for login, got %d", resp.StatusCode)
	}

	// 4. Initiate Notion Login
	authReq, _ := http.NewRequest("GET", ts.URL+"/auth/login/notion", nil)
	resp, err = client.Do(authReq)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		t.Fatalf("Expected 302 Found for auth init, got %d", resp.StatusCode)
	}

	loc, err := url.Parse(resp.Header.Get("Location"))
	if err != nil {
		t.Fatal(err)
	}

	// Verify redirect to mock auth URL
	if !strings.HasPrefix(loc.String(), mockOAuthServer.URL+"/authorize") {
		t.Errorf("Expected redirect to %s..., got %s", mockOAuthServer.URL+"/authorize", loc.String())
	}

	state := loc.Query().Get("state")
	if state == "" {
		t.Error("State parameter missing in redirect URL")
	}

	// 5. Callback
	// Simulate the user being redirected back with code and state
	callbackURL := ts.URL + "/auth/callback/notion?code=mock_code&state=" + state
	callbackReq, _ := http.NewRequest("GET", callbackURL, nil)

	resp, err = client.Do(callbackReq)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusFound {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected 302 Found at callback, got %d. Body: %s", resp.StatusCode, string(body))
	}

	// 6. Verify Token in Session
	meReq, _ := http.NewRequest("GET", ts.URL+"/auth/me", nil)
	resp, err = client.Do(meReq)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected 200 OK for /auth/me, got %d", resp.StatusCode)
	}

	var meResp map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&meResp); err != nil {
		t.Fatal(err)
	}

	if loggedIn, ok := meResp["logged_in"].(bool); !ok || !loggedIn {
		t.Errorf("Expected logged_in to be true")
	}

	services, ok := meResp["services"].([]interface{})
	if !ok {
		t.Fatalf("Expected services list in response")
	}

	hasNotion := false
	for _, s := range services {
		if s == "notion" {
			hasNotion = true
			break
		}
	}

	if !hasNotion {
		t.Errorf("Expected 'notion' in services list, got %v", services)
	}
}
