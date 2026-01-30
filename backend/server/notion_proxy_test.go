package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mnehpets/oneserve/endpoint"
	"github.com/mnehpets/oneserve/middleware"
)

func TestNotionProxy(t *testing.T) {
	// 1. Mock Notion API
	mockNotion := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Errorf("Expected Authorization header 'Bearer test-token', got '%s'", r.Header.Get("Authorization"))
		}
		// ReverseProxy might modify the path, but we expect /v1/pages
		if r.URL.Path != "/v1/pages" {
			t.Errorf("Expected path '/v1/pages', got '%s'", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"object":"list"}`))
	}))
	defer mockNotion.Close()

	// Ensure proxy targets the mock server rather than the real Notion API.
	oldNotionAPIURL := notionAPIURL
	notionAPIURL = mockNotion.URL
	defer func() { notionAPIURL = oldNotionAPIURL }()

	// 2. Setup Server
	cfg := &Config{
		Port:        "8080",
		SessionKey:  "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=",
		PublicURL:   "http://localhost:8080",
		FrontendDir: ".",
	}
	s, err := New(cfg)
	if err != nil {
		t.Fatalf("Failed to create server: %v", err)
	}

	// 3. Register backdoor route to set session
	// We need to wrap it with processors to get access to session
	processors := []endpoint.Processor{s.sessionProcessor}

	s.mux.Handle("POST /test/setup-session", endpoint.HandleFunc(func(w http.ResponseWriter, r *http.Request, _ struct{}) (endpoint.Renderer, error) {
		session, ok := middleware.SessionFromContext(r.Context())
		if !ok {
			return nil, endpoint.Error(http.StatusInternalServerError, "no session", nil)
		}

		// Login as anon/user
		if err := session.Login("testuser"); err != nil {
			return nil, endpoint.Error(http.StatusInternalServerError, "login failed", err)
		}

		// Set token
		token := NotionToken{AccessToken: "test-token"}
		if err := session.Set("notion_token", token); err != nil {
			return nil, endpoint.Error(http.StatusInternalServerError, "set token failed", err)
		}

		return &endpoint.JSONRenderer{Value: "ok"}, nil
	}, processors...))

	ts := httptest.NewServer(s.mux)
	defer ts.Close()

	client := ts.Client()

	// 4. Call setup-session to get cookie
	req, _ := http.NewRequest("POST", ts.URL+"/test/setup-session", nil)
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("Setup session failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Setup session returned status %d", resp.StatusCode)
	}

	cookies := resp.Cookies()
	if len(cookies) == 0 {
		t.Fatal("No cookies received from setup-session")
	}

	// 5. Call Proxy
	req, _ = http.NewRequest("GET", ts.URL+"/api/notion/v1/pages", nil)
	for _, c := range cookies {
		req.AddCookie(c)
	}

	resp, err = client.Do(req)
	if err != nil {
		t.Fatalf("Proxy request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}
