package server_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSecurityHeaders(t *testing.T) {
	srv := setupTestServer(t)
	ts := httptest.NewServer(http.Handler(srv))
	defer ts.Close()

	// Test endpoints that use the processor chain
	endpoints := []string{
		"/",                // FileSystem
		"/u/dashboard",     // Frontend
		"/auth/login/anon", // Session (POST)
		"/auth/me",         // Session (GET)
	}

	for _, path := range endpoints {
		t.Run(path, func(t *testing.T) {
			var req *http.Request
			if path == "/auth/login/anon" {
				req, _ = http.NewRequest("POST", ts.URL+path, nil)
			} else {
				req, _ = http.NewRequest("GET", ts.URL+path, nil)
			}

			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			defer resp.Body.Close()

			// Check X-Frame-Options
			if got := resp.Header.Get("X-Frame-Options"); got != "DENY" {
				t.Errorf("Path %s: X-Frame-Options = %q; want DENY", path, got)
			}
			// check X-Content-Type-Options
			if got := resp.Header.Get("X-Content-Type-Options"); got != "nosniff" {
				t.Errorf("Path %s: X-Content-Type-Options = %q; want nosniff", path, got)
			}
			// check Referrer-Policy
			if got := resp.Header.Get("Referrer-Policy"); got != "strict-origin-when-cross-origin" {
				t.Errorf("Path %s: Referrer-Policy = %q; want strict-origin-when-cross-origin", path, got)
			}
		})
	}
}
