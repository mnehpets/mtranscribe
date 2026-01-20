package server

import (
	"strings"
)

// ValidateNextURL validates that the next_url parameter is safe for redirect.
// According to the spec, next_url must start with "/u/" to be considered valid.
// If invalid, returns the default safe path "/u".
func ValidateNextURL(nextURL string) string {
	// Allow exactly "/u" or paths starting with "/u/"
	if nextURL == "/u" || strings.HasPrefix(nextURL, "/u/") {
		// Also check for protocol-relative URLs
		if strings.HasPrefix(nextURL, "//") {
			return "/u"
		}
		return nextURL
	}
	return "/u"
}
