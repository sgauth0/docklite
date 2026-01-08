package handlers

import (
	"docklite-agent/internal/docker"
	"docklite-agent/internal/store"
)

type Handlers struct {
	docker *docker.Client
	store  *store.SQLiteStore
}

func New(dockerClient *docker.Client, store *store.SQLiteStore) *Handlers {
	return &Handlers{docker: dockerClient, store: store}
}
