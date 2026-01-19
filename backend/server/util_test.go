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
			name:     "Empty URL returns default",
			input:    "",
			expected: "/u",
		},
		{
			name:     "Valid /u path",
			input:    "/u",
			expected: "/u",
		},
		{
			name:     "Valid /u/ with path",
			input:    "/u/dashboard",
			expected: "/u/dashboard",
		},
		{
			name:     "Valid /u/ with nested path",
			input:    "/u/settings/profile",
			expected: "/u/settings/profile",
		},
		{
			name:     "Invalid external URL",
			input:    "https://evil.com",
			expected: "/u",
		},
		{
			name:     "Invalid protocol-relative URL",
			input:    "//evil.com",
			expected: "/u",
		},
		{
			name:     "Invalid path not starting with /u/",
			input:    "/admin",
			expected: "/u",
		},
		{
			name:     "Invalid path /user (not /u/)",
			input:    "/user",
			expected: "/u",
		},
		{
			name:     "Valid /u/ with query params",
			input:    "/u/dashboard?tab=settings",
			expected: "/u/dashboard?tab=settings",
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
