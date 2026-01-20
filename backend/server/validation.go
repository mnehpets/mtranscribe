package server

import (
	"strings"
)

// ValidateNextURL validates that the next_url parameter is safe for redirect.
// According to the spec, next_url must start with "/u/" to be considered valid.
// If invalid, returns the default safe path "/u".
func ValidateNextURL(nextURL string) string {
	// First check for protocol-relative URLs (e.g., "//evil.com/u/")
	if strings.HasPrefix(nextURL, "//") {
		return "/u"
	}
	
	// Allow exactly "/u" or paths starting with "/u/"
	if nextURL == "/u" || strings.HasPrefix(nextURL, "/u/") {
		return nextURL
	}
	
	return "/u"
}
