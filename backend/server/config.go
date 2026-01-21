package server

import (
	"fmt"

	"github.com/knadh/koanf/parsers/dotenv"
	"github.com/knadh/koanf/providers/env"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
)

// Config holds the application configuration.
type Config struct {
	// Port is the HTTP server port.
	Port string

	// SessionKey is the secret key used for session encryption (32 bytes hex-encoded for ChaCha20-Poly1305).
	SessionKey string

	// NotionClientID is the Notion OAuth client ID.
	NotionClientID string

	// NotionClientSecret is the Notion OAuth client secret.
	NotionClientSecret string

	// PublicURL is the public base URL of the application (e.g., "http://localhost:8080").
	PublicURL string

	// FrontendDir is the directory containing the frontend build artifacts.
	FrontendDir string
}

// LoadConfig loads configuration from a .env file (if present) and environment variables.
// OS environment variables take precedence over .env file values.
// This function does NOT pollute the process environment with .env values.
func LoadConfig(envFile string) (*Config, error) {
	k := koanf.New(".")

	// Load from .env file first (if it exists)
	// The file provider doesn't pollute the process environment
	if err := k.Load(file.Provider(envFile), dotenv.Parser()); err != nil {
		// File might not exist, which is okay - we'll use OS env and defaults
	}

	// Load from OS environment (takes precedence over .env file)
	// The env provider reads from os.Environ() but doesn't modify it
	if err := k.Load(env.Provider("", ".", nil), nil); err != nil {
		return nil, fmt.Errorf("error loading environment variables: %w", err)
	}

	// Unmarshal into config struct with defaults
	cfg := &Config{
		Port:               getStringWithDefault(k, "PORT", "8080"),
		SessionKey:         k.String("SESSION_KEY"),
		NotionClientID:     k.String("NOTION_CLIENT_ID"),
		NotionClientSecret: k.String("NOTION_CLIENT_SECRET"),
		PublicURL:          getStringWithDefault(k, "PUBLIC_URL", "http://localhost:8080"),
		FrontendDir:        getStringWithDefault(k, "FRONTEND_DIR", "../frontend/dist"),
	}

	// Validate required fields
	if cfg.SessionKey == "" {
		return nil, fmt.Errorf("SESSION_KEY is required")
	}
	if cfg.NotionClientID == "" {
		return nil, fmt.Errorf("NOTION_CLIENT_ID is required")
	}
	if cfg.NotionClientSecret == "" {
		return nil, fmt.Errorf("NOTION_CLIENT_SECRET is required")
	}

	return cfg, nil
}

// getStringWithDefault returns the string value for a key, or a default if not found.
func getStringWithDefault(k *koanf.Koanf, key, defaultValue string) string {
	if v := k.String(key); v != "" {
		return v
	}
	return defaultValue
}
