package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad_EnvFilePrecedence(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir := t.TempDir()
	oldDir, _ := os.Getwd()
	defer os.Chdir(oldDir)
	os.Chdir(tmpDir)

	// Test 1: Load from .env file when OS env is not set
	t.Run("LoadFromEnvFile", func(t *testing.T) {
		// Create .env file
		envContent := `NOTION_CLIENT_ID=env_file_id
NOTION_CLIENT_SECRET=env_file_secret
PORT=9090`
		err := os.WriteFile(filepath.Join(tmpDir, ".env"), []byte(envContent), 0644)
		if err != nil {
			t.Fatalf("Failed to create .env file: %v", err)
		}

		config, err := Load()
		if err != nil {
			t.Fatalf("Load() failed: %v", err)
		}

		if config.NotionClientID != "env_file_id" {
			t.Errorf("Expected NotionClientID=env_file_id, got %s", config.NotionClientID)
		}
		if config.NotionClientSecret != "env_file_secret" {
			t.Errorf("Expected NotionClientSecret=env_file_secret, got %s", config.NotionClientSecret)
		}
		if config.Port != "9090" {
			t.Errorf("Expected Port=9090, got %s", config.Port)
		}

		// Verify process env is unchanged
		if os.Getenv("NOTION_CLIENT_ID") != "" {
			t.Errorf("Process environment was polluted: NOTION_CLIENT_ID=%s", os.Getenv("NOTION_CLIENT_ID"))
		}
	})

	// Clean up
	os.Remove(filepath.Join(tmpDir, ".env"))

	// Test 2: OS environment takes precedence over .env file
	t.Run("OSEnvPrecedence", func(t *testing.T) {
		// Create .env file
		envContent := `NOTION_CLIENT_ID=env_file_id
PORT=9090`
		err := os.WriteFile(filepath.Join(tmpDir, ".env"), []byte(envContent), 0644)
		if err != nil {
			t.Fatalf("Failed to create .env file: %v", err)
		}

		// Set OS environment variable
		os.Setenv("NOTION_CLIENT_ID", "os_env_id")
		defer os.Unsetenv("NOTION_CLIENT_ID")

		config, err := Load()
		if err != nil {
			t.Fatalf("Load() failed: %v", err)
		}

		if config.NotionClientID != "os_env_id" {
			t.Errorf("Expected NotionClientID=os_env_id (from OS env), got %s", config.NotionClientID)
		}
		if config.Port != "9090" {
			t.Errorf("Expected Port=9090 (from .env), got %s", config.Port)
		}
	})

	// Clean up
	os.Remove(filepath.Join(tmpDir, ".env"))

	// Test 3: Default values when neither .env nor OS env is set
	t.Run("DefaultValues", func(t *testing.T) {
		config, err := Load()
		if err != nil {
			t.Fatalf("Load() failed: %v", err)
		}

		if config.Port != "8080" {
			t.Errorf("Expected default Port=8080, got %s", config.Port)
		}
		if config.FrontendDistDir != "../frontend/dist" {
			t.Errorf("Expected default FrontendDistDir=../frontend/dist, got %s", config.FrontendDistDir)
		}
	})
}

func TestLoad_ScopesParsing(t *testing.T) {
	tmpDir := t.TempDir()
	oldDir, _ := os.Getwd()
	defer os.Chdir(oldDir)
	os.Chdir(tmpDir)

	// Create .env file with scopes
	envContent := `NOTION_SCOPES=read,write,admin`
	err := os.WriteFile(filepath.Join(tmpDir, ".env"), []byte(envContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create .env file: %v", err)
	}

	config, err := Load()
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}

	expectedScopes := []string{"read", "write", "admin"}
	if len(config.NotionScopes) != len(expectedScopes) {
		t.Errorf("Expected %d scopes, got %d", len(expectedScopes), len(config.NotionScopes))
	}
	for i, scope := range expectedScopes {
		if i >= len(config.NotionScopes) || config.NotionScopes[i] != scope {
			t.Errorf("Expected scope[%d]=%s, got %s", i, scope, config.NotionScopes[i])
		}
	}
}

func TestLoad_EnvFileComments(t *testing.T) {
	tmpDir := t.TempDir()
	oldDir, _ := os.Getwd()
	defer os.Chdir(oldDir)
	os.Chdir(tmpDir)

	// Create .env file with comments and empty lines
	envContent := `# This is a comment
PORT=3000

# Another comment
NOTION_CLIENT_ID=test_id
`
	err := os.WriteFile(filepath.Join(tmpDir, ".env"), []byte(envContent), 0644)
	if err != nil {
		t.Fatalf("Failed to create .env file: %v", err)
	}

	config, err := Load()
	if err != nil {
		t.Fatalf("Load() failed: %v", err)
	}

	if config.Port != "3000" {
		t.Errorf("Expected Port=3000, got %s", config.Port)
	}
	if config.NotionClientID != "test_id" {
		t.Errorf("Expected NotionClientID=test_id, got %s", config.NotionClientID)
	}
}
