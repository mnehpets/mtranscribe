package main

import (
	"log"

	"github.com/mnehpets/mtranscribe/backend/server"
)

func main() {
	// Load configuration
	cfg, err := server.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Create and start server
	srv, err := server.New(cfg)
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}

	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
