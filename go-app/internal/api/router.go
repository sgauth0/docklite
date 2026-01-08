package api

import (
	"net/http"

	"docklite-agent/internal/handlers"
)

func NewRouter(handlers *handlers.Handlers) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", handlers.Health)
	mux.HandleFunc("/status", handlers.Status)
	mux.HandleFunc("/apps", handlers.ListApps)
	mux.HandleFunc("/apps/", handlers.Apps)
	return mux
}
