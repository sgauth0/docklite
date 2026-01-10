package handlers

import (
	"net/http"

	"docklite-agent/internal/docker"
	"docklite-agent/internal/store"
)

type Handlers struct {
	docker *docker.Client
	store  *store.SQLiteStore
	token  string
}

func New(dockerClient *docker.Client, store *store.SQLiteStore, token string) *Handlers {
	return &Handlers{docker: dockerClient, store: store, token: token}
}

func (h *Handlers) Auth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if h.token == "" {
			next(w, r)
			return
		}
		if r.Header.Get("X-Docklite-Token") != h.token {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		next(w, r)
	}
}
