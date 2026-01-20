package server

import (
	"strings"
)

// ValidateNextURL validates the next_url parameter to prevent open redirect vulnerabilities.
// According to the spec, next_url must start with "/u/" to be considered valid.
// If invalid, returns a default safe path "/u".
func ValidateNextURL(nextURL string) string {
	if nextURL == "" || !strings.HasPrefix(nextURL, "/u/") {
		return "/u"
	}
	// Also check for protocol-relative URLs
	if strings.HasPrefix(nextURL, "//") {
		return "/u"
	}
	return nextURL
}
