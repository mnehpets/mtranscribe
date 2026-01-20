package server

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all server configuration.
type Config struct {
	Port               string
	SessionKey         string
	NotionClientID     string
	NotionClientSecret string
	NotionScopes       []string
	PublicURL          string
	FrontendPath       string
}

// LoadConfig loads configuration from .env file and environment variables.
// Environment variables take precedence over .env file values.
// Values from .env are NOT set into the process environment to prevent secret leakage.
func LoadConfig() (*Config, error) {
	// Load .env file if it exists, but don't fail if it doesn't
	envMap, err := godotenv.Read(".env")
	if err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("error reading .env file: %w", err)
	}
	if envMap == nil {
		envMap = make(map[string]string)
	}

	// Helper to get value: OS env takes precedence over .env file
	getValue := func(key, defaultVal string) string {
		// Check OS environment first
		if val := os.Getenv(key); val != "" {
			return val
		}
		// Then check .env file
		if val, ok := envMap[key]; ok && val != "" {
			return val
		}
		return defaultVal
	}

	cfg := &Config{
		Port:               getValue("PORT", "8080"),
		SessionKey:         getValue("SESSION_KEY", ""),
		NotionClientID:     getValue("NOTION_CLIENT_ID", ""),
		NotionClientSecret: getValue("NOTION_CLIENT_SECRET", ""),
		PublicURL:          getValue("PUBLIC_URL", "http://localhost:8080"),
		FrontendPath:       getValue("FRONTEND_PATH", "../frontend/dist"),
	}

	// Parse Notion scopes (default is empty, which will result in no scopes being requested)
	// For Notion, typical scopes might be empty or custom ones
	// The spec says "Principle of Least Privilege: OAuth Scopes MUST be configured to request the minimum necessary permissions"
	cfg.NotionScopes = []string{} // Minimal scopes - can be configured via env if needed

	return cfg, nil
}
