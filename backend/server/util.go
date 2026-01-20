package server

import (
	"strings"
)

// ValidateNextURL validates the next_url parameter to prevent open redirect vulnerabilities.
// According to the spec, next_url must start with "/u/" or be exactly "/u" to be considered valid.
// If invalid, returns a default safe path "/u".
func ValidateNextURL(nextURL string) string {
	if nextURL == "" {
		return "/u"
	}
	// Accept "/u" or paths starting with "/u/"
	if nextURL == "/u" || strings.HasPrefix(nextURL, "/u/") {
		// Also check for protocol-relative URLs (defense in depth)
		if strings.HasPrefix(nextURL, "//") {
			return "/u"
		}
		return nextURL
	}
	return "/u"
}
