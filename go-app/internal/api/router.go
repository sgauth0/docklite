package api

import (
	"net/http"
	"strings"

	"docklite-agent/internal/handlers"
)

func NewRouter(handlers *handlers.Handlers, nextjsURL string) http.Handler {
	mux := http.NewServeMux()

	// Agent-handled API routes (Docker operations)
	mux.HandleFunc("/api/health", handlers.Auth(handlers.Health))
	mux.HandleFunc("/api/status", handlers.Auth(handlers.Status))
	mux.HandleFunc("/api/summary", handlers.Auth(handlers.Summary))
	mux.HandleFunc("/api/containers", handlers.Auth(handlers.ListContainers))
	mux.HandleFunc("/api/containers/", handlers.Auth(handlers.Container))
	mux.HandleFunc("/api/databases", handlers.Auth(handlers.Databases))
	mux.HandleFunc("/api/files", handlers.Auth(handlers.Files))
	mux.HandleFunc("/api/files/content", handlers.Auth(handlers.FileContent))
	mux.HandleFunc("/api/files/create", handlers.Auth(handlers.CreatePath))
	mux.HandleFunc("/api/files/delete", handlers.Auth(handlers.DeletePath))
	mux.HandleFunc("/api/files/rename", handlers.Auth(handlers.RenamePath))

	// Proxy for Next.js
	proxy := ProxyHandler(nextjsURL)

	// Wrap the mux with a handler that proxies non-API routes
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if this is an agent-handled route
		if strings.HasPrefix(r.URL.Path, "/api/health") ||
		   strings.HasPrefix(r.URL.Path, "/api/status") ||
		   strings.HasPrefix(r.URL.Path, "/api/summary") ||
		   strings.HasPrefix(r.URL.Path, "/api/containers") ||
		   strings.HasPrefix(r.URL.Path, "/api/databases") ||
		   strings.HasPrefix(r.URL.Path, "/api/files") {
			// Agent handles this
			mux.ServeHTTP(w, r)
		} else {
			// Proxy everything else to Next.js
			proxy.ServeHTTP(w, r)
		}
	})
}
