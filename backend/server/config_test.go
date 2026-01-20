package server

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfig_OSEnvPrecedence(t *testing.T) {
	// Create a temporary .env file
	tmpDir := t.TempDir()
	envFile := filepath.Join(tmpDir, ".env")
	envContent := `NOTION_CLIENT_ID=env_file_id
PORT=9999
`
	if err := os.WriteFile(envFile, []byte(envContent), 0644); err != nil {
		t.Fatalf("Failed to create test .env file: %v", err)
	}

	// Save current directory and change to temp dir
	oldWd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get working directory: %v", err)
	}
	defer os.Chdir(oldWd)
	
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	// Set OS environment variable
	oldEnvVal := os.Getenv("NOTION_CLIENT_ID")
	os.Setenv("NOTION_CLIENT_ID", "os_env_id")
	defer func() {
		if oldEnvVal != "" {
			os.Setenv("NOTION_CLIENT_ID", oldEnvVal)
		} else {
			os.Unsetenv("NOTION_CLIENT_ID")
		}
	}()

	// Load config
	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}

	// OS environment should take precedence
	if cfg.NotionClientID != "os_env_id" {
		t.Errorf("Expected NotionClientID = 'os_env_id', got %q", cfg.NotionClientID)
	}

	// PORT from .env file should be used (no OS env set)
	if cfg.Port != "9999" {
		t.Errorf("Expected Port = '9999', got %q", cfg.Port)
	}
}

func TestLoadConfig_FromEnvFile(t *testing.T) {
	// Create a temporary .env file
	tmpDir := t.TempDir()
	envFile := filepath.Join(tmpDir, ".env")
	envContent := `NOTION_CLIENT_ID=test_client_id
NOTION_CLIENT_SECRET=test_secret
PORT=3000
PUBLIC_URL=https://example.com
`
	if err := os.WriteFile(envFile, []byte(envContent), 0644); err != nil {
		t.Fatalf("Failed to create test .env file: %v", err)
	}

	// Save current directory and change to temp dir
	oldWd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get working directory: %v", err)
	}
	defer os.Chdir(oldWd)
	
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	// Unset relevant OS environment variables to ensure we're reading from .env
	envVars := []string{"NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET", "PORT", "PUBLIC_URL"}
	oldVals := make(map[string]string)
	for _, v := range envVars {
		oldVals[v] = os.Getenv(v)
		os.Unsetenv(v)
	}
	defer func() {
		for k, v := range oldVals {
			if v != "" {
				os.Setenv(k, v)
			}
		}
	}()

	// Load config
	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}

	// Verify values from .env file
	if cfg.NotionClientID != "test_client_id" {
		t.Errorf("Expected NotionClientID = 'test_client_id', got %q", cfg.NotionClientID)
	}
	if cfg.NotionClientSecret != "test_secret" {
		t.Errorf("Expected NotionClientSecret = 'test_secret', got %q", cfg.NotionClientSecret)
	}
	if cfg.Port != "3000" {
		t.Errorf("Expected Port = '3000', got %q", cfg.Port)
	}
	if cfg.PublicURL != "https://example.com" {
		t.Errorf("Expected PublicURL = 'https://example.com', got %q", cfg.PublicURL)
	}
}

func TestLoadConfig_NoEnvFileUsesDefaults(t *testing.T) {
	// Create a temporary directory without .env file
	tmpDir := t.TempDir()
	
	// Save current directory and change to temp dir
	oldWd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get working directory: %v", err)
	}
	defer os.Chdir(oldWd)
	
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	// Unset relevant OS environment variables
	envVars := []string{"PORT", "PUBLIC_URL", "FRONTEND_PATH"}
	oldVals := make(map[string]string)
	for _, v := range envVars {
		oldVals[v] = os.Getenv(v)
		os.Unsetenv(v)
	}
	defer func() {
		for k, v := range oldVals {
			if v != "" {
				os.Setenv(k, v)
			}
		}
	}()

	// Load config
	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}

	// Verify default values
	if cfg.Port != "8080" {
		t.Errorf("Expected default Port = '8080', got %q", cfg.Port)
	}
	if cfg.PublicURL != "http://localhost:8080" {
		t.Errorf("Expected default PublicURL = 'http://localhost:8080', got %q", cfg.PublicURL)
	}
	if cfg.FrontendPath != "../frontend/dist" {
		t.Errorf("Expected default FrontendPath = '../frontend/dist', got %q", cfg.FrontendPath)
	}
}

func TestLoadConfig_NoProcessEnvPollution(t *testing.T) {
	// Create a temporary .env file
	tmpDir := t.TempDir()
	envFile := filepath.Join(tmpDir, ".env")
	envContent := `NOTION_CLIENT_ID=env_file_id
`
	if err := os.WriteFile(envFile, []byte(envContent), 0644); err != nil {
		t.Fatalf("Failed to create test .env file: %v", err)
	}

	// Save current directory and change to temp dir
	oldWd, err := os.Getwd()
	if err != nil {
		t.Fatalf("Failed to get working directory: %v", err)
	}
	defer os.Chdir(oldWd)
	
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("Failed to change to temp directory: %v", err)
	}

	// Ensure OS env is not set
	oldEnvVal := os.Getenv("NOTION_CLIENT_ID")
	os.Unsetenv("NOTION_CLIENT_ID")
	defer func() {
		if oldEnvVal != "" {
			os.Setenv("NOTION_CLIENT_ID", oldEnvVal)
		}
	}()

	// Load config
	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}

	// Config should have the value from .env
	if cfg.NotionClientID != "env_file_id" {
		t.Errorf("Expected NotionClientID = 'env_file_id', got %q", cfg.NotionClientID)
	}

	// But OS environment should remain empty (no pollution)
	if val := os.Getenv("NOTION_CLIENT_ID"); val != "" {
		t.Errorf("Expected os.Getenv('NOTION_CLIENT_ID') to be empty, got %q", val)
	}
}
