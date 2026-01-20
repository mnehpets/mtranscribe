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
			name:     "Valid URL starting with /u/",
			input:    "/u/dashboard",
			expected: "/u/dashboard",
		},
		{
			name:     "Valid URL /u/ exactly",
			input:    "/u/",
			expected: "/u/",
		},
		{
			name:     "Empty string returns default",
			input:    "",
			expected: "/u",
		},
		{
			name:     "Absolute URL rejected",
			input:    "https://evil.com",
			expected: "/u",
		},
		{
			name:     "Protocol-relative URL rejected",
			input:    "//evil.com/path",
			expected: "/u",
		},
		{
			name:     "Path not starting with /u/ rejected",
			input:    "/admin",
			expected: "/u",
		},
		{
			name:     "Path /u accepted",
			input:    "/u",
			expected: "/u",
		},
		{
			name:     "Valid deep path",
			input:    "/u/some/deep/path",
			expected: "/u/some/deep/path",
		},
		{
			name:     "Path starting with /user rejected (not /u/)",
			input:    "/user/profile",
			expected: "/u",
		},
		{
			name:     "Root path rejected",
			input:    "/",
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

func TestValidateLogoutNextURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Empty string returns /",
			input:    "",
			expected: "/",
		},
		{
			name:     "Root path / accepted",
			input:    "/",
			expected: "/",
		},
		{
			name:     "Path /u accepted",
			input:    "/u",
			expected: "/u",
		},
		{
			name:     "Path /u/ accepted",
			input:    "/u/",
			expected: "/u/",
		},
		{
			name:     "Path /u/dashboard accepted",
			input:    "/u/dashboard",
			expected: "/u/dashboard",
		},
		{
			name:     "Path /admin rejected",
			input:    "/admin",
			expected: "/u",
		},
		{
			name:     "Absolute URL rejected",
			input:    "https://evil.com",
			expected: "/u",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateLogoutNextURL(tt.input)
			if result != tt.expected {
				t.Errorf("ValidateLogoutNextURL(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
