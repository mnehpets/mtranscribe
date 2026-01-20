package server

import (
	"testing"
)

func TestValidateNextURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "valid path starting with /u/",
			input:    "/u/dashboard",
			expected: "/u/dashboard",
		},
		{
			name:     "valid path /u/ exactly",
			input:    "/u/",
			expected: "/u/",
		},
		{
			name:     "valid path /u exactly",
			input:    "/u",
			expected: "/u",
		},
		{
			name:     "invalid empty string",
			input:    "",
			expected: "/u",
		},
		{
			name:     "invalid absolute URL",
			input:    "https://evil.com",
			expected: "/u",
		},
		{
			name:     "invalid protocol-relative URL",
			input:    "//evil.com",
			expected: "/u",
		},
		{
			name:     "invalid path not starting with /u/",
			input:    "/admin",
			expected: "/u",
		},
		{
			name:     "invalid path /user (doesn't start with /u/)",
			input:    "/user",
			expected: "/u",
		},
		{
			name:     "valid nested path",
			input:    "/u/dashboard/settings",
			expected: "/u/dashboard/settings",
		},
		{
			name:     "invalid relative path without leading slash",
			input:    "u/dashboard",
			expected: "/u",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateNextURL(tt.input)
			if result != tt.expected {
				t.Errorf("ValidateNextURL(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
