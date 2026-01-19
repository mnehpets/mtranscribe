package main

import (
	"log"

	"github.com/mnehpets/mtranscribe/backend/config"
	"github.com/mnehpets/mtranscribe/backend/server"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Create server
	srv, err := server.New(cfg)
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}

	// Start server
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
