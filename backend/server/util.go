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
	// Check for protocol-relative URLs first (defense in depth)
	if strings.HasPrefix(nextURL, "//") {
		return "/u"
	}
	// Accept "/u" or paths starting with "/u/"
	if nextURL == "/u" || strings.HasPrefix(nextURL, "/u/") {
		return nextURL
	}
	return "/u"
}

// ValidateLogoutNextURL validates the next_url parameter for logout endpoints.
// Unlike regular validation, logout accepts "/" in addition to "/u" or "/u/*" paths,
// since logging out may redirect to the public home page.
func ValidateLogoutNextURL(nextURL string) string {
	if nextURL == "" || nextURL == "/" {
		return "/"
	}
	// For all other paths, use standard validation
	return ValidateNextURL(nextURL)
}
