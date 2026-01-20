package server

import (
	"github.com/ilyakaznacheev/cleanenv"
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
	
	// ReadConfig reads from the .env file and OS env vars without calling os.Setenv
	if err := cleanenv.ReadConfig(envFile, &cfg); err != nil {
		// If the .env file doesn't exist, try reading from OS env only
		if err := cleanenv.ReadEnv(&cfg); err != nil {
			return nil, err
		}
	}
	
	return &cfg, nil
}
