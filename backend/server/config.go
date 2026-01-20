package server

import (
	"os"

	"github.com/ilyakaznacheev/cleanenv"
	"github.com/joho/godotenv"
)

// Config holds the application configuration.
type Config struct {
	// Port is the HTTP server port.
	Port string `env:"PORT" env-default:"8080"`

	// SessionKey is the secret key used for session encryption (32 bytes hex-encoded for ChaCha20-Poly1305).
	SessionKey string `env:"SESSION_KEY" env-required:"true"`

	// NotionClientID is the Notion OAuth client ID.
	NotionClientID string `env:"NOTION_CLIENT_ID" env-required:"true"`

	// NotionClientSecret is the Notion OAuth client secret.
	NotionClientSecret string `env:"NOTION_CLIENT_SECRET" env-required:"true"`

	// PublicURL is the public base URL of the application (e.g., "http://localhost:8080").
	PublicURL string `env:"PUBLIC_URL" env-default:"http://localhost:8080"`

	// FrontendDir is the directory containing the frontend build artifacts.
	FrontendDir string `env:"FRONTEND_DIR" env-default:"../frontend/dist"`
}

// LoadConfig loads configuration from a .env file (if present) and environment variables.
// OS environment variables take precedence over .env file values.
// This function does NOT pollute the process environment with .env values.
func LoadConfig(envFile string) (*Config, error) {
	var cfg Config

	// First, try to read the .env file without loading it into the environment
	envMap, err := godotenv.Read(envFile)
	if err != nil {
		// If file doesn't exist or can't be read, just use OS environment
		if err := cleanenv.ReadEnv(&cfg); err != nil {
			return nil, err
		}
		return &cfg, nil
	}

	// Temporarily set environment variables from the .env file
	// but only if they're not already set in the OS environment
	originalEnv := make(map[string]string)
	keysToUnset := make([]string, 0)

	for key, value := range envMap {
		if osValue, exists := os.LookupEnv(key); exists {
			// OS env takes precedence - keep the original
			originalEnv[key] = osValue
		} else {
			// Mark this key for unsetting later
			keysToUnset = append(keysToUnset, key)
			os.Setenv(key, value)
		}
	}

	// Read configuration from environment
	err = cleanenv.ReadEnv(&cfg)

	// Clean up: unset the keys we added from .env file
	for _, key := range keysToUnset {
		os.Unsetenv(key)
	}

	if err != nil {
		return nil, err
	}

	return &cfg, nil
}
