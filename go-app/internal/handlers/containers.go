package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"docklite-agent/internal/models"
)

func (h *Handlers) ListApps(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	containers, err := h.docker.ListContainers(ctx, true)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"containers": containers})
}

func (h *Handlers) Apps(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/apps/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	id := parts[0]
	action := ""
	if len(parts) > 1 {
		action = parts[1]
	}

	switch action {
	case "start":
		h.handleLifecycle(w, r, id, h.docker.StartContainer)
	case "stop":
		h.handleLifecycle(w, r, id, h.docker.StopContainer)
	case "restart":
		h.handleLifecycle(w, r, id, h.docker.RestartContainer)
	case "logs":
		h.handleLogs(w, r, id)
	case "stats":
		h.handleStats(w, r, id)
	case "inspect":
		h.handleInspect(w, r, id)
	case "":
		h.handleApp(w, r, id)
	default:
		writeError(w, http.StatusNotFound, "not found")
	}
}

func (h *Handlers) handleLifecycle(w http.ResponseWriter, r *http.Request, id string, action func(context.Context, string) error) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	if err := action(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (h *Handlers) handleLogs(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	trail := r.URL.Query().Get("tail")
	if trail == "" {
		trail = "200"
	}
	logs, err := h.docker.ContainerLogs(ctx, id, trail)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"logs": logs})
}

func (h *Handlers) handleStats(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	stats, err := h.docker.ContainerStats(ctx, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]*models.ContainerStats{"stats": stats})
}

func (h *Handlers) handleInspect(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	container, err := h.docker.InspectContainer(ctx, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"container": container})
}

func (h *Handlers) handleApp(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	container, err := h.docker.InspectContainer(ctx, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	var stats *models.ContainerStats
	if container.State != nil && container.State.Running {
		stats, _ = h.docker.ContainerStats(ctx, id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"container": container, "stats": stats})
}
