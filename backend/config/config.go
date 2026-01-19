package config

import (
	"bufio"
	"crypto/rand"
	"fmt"
	"os"
	"strings"
)

// Config holds the application configuration.
type Config struct {
	// Server configuration
	Port string
	Host string

	// Notion OAuth configuration
	NotionClientID     string
	NotionClientSecret string
	NotionRedirectURL  string
	NotionScopes       []string

	// Session configuration
	SessionKey      []byte
	SecureCookie    bool
	FrontendDistDir string
}

// Load loads configuration from .env file and environment variables.
// Environment variables take precedence over .env file values.
// This function does NOT pollute the process environment.
func Load() (*Config, error) {
	// Load .env file into a map
	envMap := make(map[string]string)
	if file, err := os.Open(".env"); err == nil {
		defer file.Close()
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			// Skip empty lines and comments
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			// Parse KEY=VALUE
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])
				// Remove quotes if present
				value = strings.Trim(value, `"'`)
				envMap[key] = value
			}
		}
		if err := scanner.Err(); err != nil {
			return nil, fmt.Errorf("error reading .env file: %w", err)
		}
	}

	// Helper function to get value with precedence: OS env > .env file > default
	getEnv := func(key, defaultValue string) string {
		// Check OS environment first
		if value := os.Getenv(key); value != "" {
			return value
		}
		// Then check .env map
		if value, ok := envMap[key]; ok {
			return value
		}
		// Finally return default
		return defaultValue
	}

	config := &Config{
		Port:               getEnv("PORT", "8080"),
		Host:               getEnv("HOST", ""),
		NotionClientID:     getEnv("NOTION_CLIENT_ID", ""),
		NotionClientSecret: getEnv("NOTION_CLIENT_SECRET", ""),
		NotionRedirectURL:  getEnv("NOTION_REDIRECT_URL", "http://localhost:8080/auth/callback/notion"),
		SecureCookie:       getEnv("SECURE_COOKIE", "false") == "true",
		FrontendDistDir:    getEnv("FRONTEND_DIST_DIR", "../frontend/dist"),
	}

	// Parse Notion scopes (comma-separated)
	scopesStr := getEnv("NOTION_SCOPES", "")
	if scopesStr != "" {
		config.NotionScopes = strings.Split(scopesStr, ",")
		for i := range config.NotionScopes {
			config.NotionScopes[i] = strings.TrimSpace(config.NotionScopes[i])
		}
	}

	// Generate session key from env or use a random one (in production, this should be persisted)
	sessionKeyStr := getEnv("SESSION_KEY", "")
	if sessionKeyStr != "" {
		config.SessionKey = []byte(sessionKeyStr)
		if len(config.SessionKey) != 32 {
			return nil, fmt.Errorf("SESSION_KEY must be exactly 32 bytes, got %d bytes", len(config.SessionKey))
		}
	} else {
		// Generate a cryptographically secure random key
		config.SessionKey = make([]byte, 32)
		if _, err := rand.Read(config.SessionKey); err != nil {
			return nil, fmt.Errorf("failed to generate session key: %w", err)
		}
		// Warning: This key is not persisted, so sessions will be invalidated on restart
		fmt.Println("Warning: SESSION_KEY not set. Generated a random session key.")
		fmt.Println("Sessions will not persist across server restarts.")
		fmt.Println("For production, set SESSION_KEY in .env to a secure 32-byte value.")
	}

	return config, nil
}
