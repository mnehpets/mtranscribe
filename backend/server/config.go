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
	Port string `koanf:"PORT"`

	// SessionKey is the secret key used for session encryption (32 bytes base64url-encoded for ChaCha20-Poly1305).
	SessionKey string `koanf:"SESSION_KEY"`

	// NotionClientID is the Notion OAuth client ID.
	NotionClientID string `koanf:"NOTION_CLIENT_ID"`

	// NotionClientSecret is the Notion OAuth client secret.
	NotionClientSecret string `koanf:"NOTION_CLIENT_SECRET"`

	// PublicURL is the public base URL of the application (e.g., "http://localhost:8080").
	PublicURL string `koanf:"PUBLIC_URL"`

	// NotionAuthURL is the Notion OAuth authorization URL.
	NotionAuthURL string `koanf:"NOTION_AUTH_URL"`

	// NotionTokenURL is the Notion OAuth token URL.
	NotionTokenURL string `koanf:"NOTION_TOKEN_URL"`

	// FrontendDir is the directory containing the frontend build artifacts.
	FrontendDir string `koanf:"FRONTEND_DIR"`
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
		Port:           "8080",
		PublicURL:      "http://localhost:8080",
		FrontendDir:    "../frontend/dist",
		NotionAuthURL:  "https://api.notion.com/v1/oauth/authorize",
		NotionTokenURL: "https://api.notion.com/v1/oauth/token",
	}

	if err := k.Unmarshal("", cfg); err != nil {
		return nil, fmt.Errorf("error unmarshalling config: %w", err)
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
