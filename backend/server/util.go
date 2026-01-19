package server

import (
	"strings"
)

// ValidateNextURL validates that the next URL is safe to redirect to.
// It must start with /u/ to prevent open redirect vulnerabilities.
// If the URL is invalid, it returns the default safe path "/u".
func ValidateNextURL(nextURL string) string {
	if nextURL == "" {
		return "/u"
	}

	// Only allow redirects to paths starting with /u/
	if strings.HasPrefix(nextURL, "/u/") || nextURL == "/u" {
		return nextURL
	}

	// Invalid redirect - return safe default
	return "/u"
}
