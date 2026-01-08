package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"docklite-agent/internal/api"
	"docklite-agent/internal/config"
	"docklite-agent/internal/docker"
	"docklite-agent/internal/handlers"
	"docklite-agent/internal/store"
)

func main() {
	cfg := config.Load()

	dockerClient, err := docker.NewClient(cfg.DockerSocketPath)
	if err != nil {
		log.Fatalf("failed to create docker client: %v", err)
	}
	defer dockerClient.Close()

	sqliteStore, err := store.NewSQLiteStore(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer sqliteStore.Close()

	handlers := handlers.New(dockerClient, sqliteStore)
	router := api.NewRouter(handlers)

	server := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-shutdown
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			log.Printf("shutdown error: %v", err)
		}
	}()

	log.Printf("docklite-agent listening on %s", cfg.ListenAddr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
}
