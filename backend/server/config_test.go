package server

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadConfig_EnvFilePrecedence(t *testing.T) {
	// Create a temporary directory for test files
	tmpDir := t.TempDir()
	envFile := filepath.Join(tmpDir, ".env")

	// Create a .env file with test values
	envContent := `SESSION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
NOTION_CLIENT_ID=env_file_id
NOTION_CLIENT_SECRET=env_file_secret
PORT=9999
`
	if err := os.WriteFile(envFile, []byte(envContent), 0644); err != nil {
		t.Fatalf("Failed to create test .env file: %v", err)
	}

	// Test 1: Load from .env file only (no OS env vars)
	t.Run("LoadFromEnvFile", func(t *testing.T) {
		cfg, err := LoadConfig(envFile)
		if err != nil {
			t.Fatalf("LoadConfig failed: %v", err)
		}

		if cfg.NotionClientID != "env_file_id" {
			t.Errorf("Expected NotionClientID=env_file_id, got %s", cfg.NotionClientID)
		}
		if cfg.NotionClientSecret != "env_file_secret" {
			t.Errorf("Expected NotionClientSecret=env_file_secret, got %s", cfg.NotionClientSecret)
		}
		if cfg.Port != "9999" {
			t.Errorf("Expected Port=9999, got %s", cfg.Port)
		}

		// Verify that the process environment is not polluted
		if os.Getenv("NOTION_CLIENT_ID") != "" {
			t.Errorf("Process environment was polluted with NOTION_CLIENT_ID")
		}
	})

	// Test 2: OS environment takes precedence
	t.Run("OSEnvPrecedence", func(t *testing.T) {
		// Set OS environment variables
		os.Setenv("NOTION_CLIENT_ID", "os_env_id")
		os.Setenv("SESSION_KEY", "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210")
		defer func() {
			os.Unsetenv("NOTION_CLIENT_ID")
			os.Unsetenv("SESSION_KEY")
		}()

		cfg, err := LoadConfig(envFile)
		if err != nil {
			t.Fatalf("LoadConfig failed: %v", err)
		}

		// OS env should override .env file
		if cfg.NotionClientID != "os_env_id" {
			t.Errorf("Expected NotionClientID=os_env_id (from OS env), got %s", cfg.NotionClientID)
		}

		// .env file value should be used for variables not set in OS env
		if cfg.NotionClientSecret != "env_file_secret" {
			t.Errorf("Expected NotionClientSecret=env_file_secret (from .env), got %s", cfg.NotionClientSecret)
		}
	})
}

func TestLoadConfig_MissingFile(t *testing.T) {
	// Set required env vars in OS environment
	os.Setenv("SESSION_KEY", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef")
	os.Setenv("NOTION_CLIENT_ID", "test_id")
	os.Setenv("NOTION_CLIENT_SECRET", "test_secret")
	defer func() {
		os.Unsetenv("SESSION_KEY")
		os.Unsetenv("NOTION_CLIENT_ID")
		os.Unsetenv("NOTION_CLIENT_SECRET")
	}()

	// Try to load config from a non-existent file (should fall back to OS env)
	cfg, err := LoadConfig("/nonexistent/.env")
	if err != nil {
		t.Fatalf("LoadConfig should fall back to OS env when .env file is missing, got error: %v", err)
	}

	if cfg.NotionClientID != "test_id" {
		t.Errorf("Expected NotionClientID=test_id, got %s", cfg.NotionClientID)
	}
}

func TestLoadConfig_MissingRequiredVars(t *testing.T) {
	// Create empty .env file
	tmpDir := t.TempDir()
	envFile := filepath.Join(tmpDir, ".env")
	if err := os.WriteFile(envFile, []byte(""), 0644); err != nil {
		t.Fatalf("Failed to create test .env file: %v", err)
	}

	// Should fail when required vars are missing
	_, err := LoadConfig(envFile)
	if err == nil {
		t.Errorf("LoadConfig should fail when required environment variables are missing")
	}
}
