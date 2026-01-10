package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"docklite-agent/internal/models"
)

const siteBaseDir = "/var/www/sites"

type createContainerRequest struct {
	Domain       string `json:"domain"`
	TemplateType string `json:"template_type"`
	IncludeWww   *bool  `json:"include_www"`
	Port         *int   `json:"port"`
}

func (h *Handlers) ListContainers(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		h.createContainer(w, r)
		return
	}
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

func (h *Handlers) Container(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/containers/")
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
	case "delete":
		h.handleDelete(w, r, id)
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
	if r.Method == http.MethodDelete {
		h.handleDelete(w, r, id)
		return
	}
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

func (h *Handlers) handleDelete(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()
	if err := h.docker.RemoveContainer(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (h *Handlers) createContainer(w http.ResponseWriter, r *http.Request) {
	var req createContainerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	domain := strings.TrimSpace(req.Domain)
	if domain == "" {
		writeError(w, http.StatusBadRequest, "domain is required")
		return
	}
	if strings.Contains(domain, "/") || strings.Contains(domain, "\\") {
		writeError(w, http.StatusBadRequest, "domain contains invalid characters")
		return
	}

	templateType := strings.ToLower(strings.TrimSpace(req.TemplateType))
	if templateType == "" {
		templateType = "static"
	}
	if templateType != "static" && templateType != "php" && templateType != "node" {
		writeError(w, http.StatusBadRequest, "unsupported template type")
		return
	}

	includeWww := true
	if req.IncludeWww != nil {
		includeWww = *req.IncludeWww
	}

	port := 3000
	if req.Port != nil {
		port = *req.Port
	}
	if templateType == "node" {
		if port < 1 || port > 65535 {
			writeError(w, http.StatusBadRequest, "invalid port")
			return
		}
	}

	sitePath := filepath.Join(siteBaseDir, domain)
	if err := os.MkdirAll(sitePath, 0o755); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := ensureDefaultFiles(sitePath, domain, templateType, port); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()
	containerID, err := h.docker.CreateSiteContainer(ctx, domain, templateType, includeWww, sitePath, port)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"id": containerID})
}

func ensureDefaultFiles(sitePath string, domain string, templateType string, port int) error {
	switch templateType {
	case "php":
		return ensureFile(filepath.Join(sitePath, "index.php"), phpTemplate(domain))
	case "node":
		if port < 1 || port > 65535 {
			port = 3000
		}
		if err := ensureFile(filepath.Join(sitePath, "package.json"), nodePackageJSON(domain)); err != nil {
			return err
		}
		return ensureFile(filepath.Join(sitePath, "index.js"), nodeTemplate(port))
	default:
		return ensureFile(filepath.Join(sitePath, "index.html"), staticTemplate(domain))
	}
}

func ensureFile(path string, content string) error {
	if _, err := os.Stat(path); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	return os.WriteFile(path, []byte(content), 0o644)
}

func staticTemplate(domain string) string {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>` + domain + `</title>
  </head>
  <body>
    <h1>` + domain + `</h1>
    <p>Welcome to your Docklite site.</p>
  </body>
</html>
`
}

func phpTemplate(domain string) string {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>` + domain + `</title>
  </head>
  <body>
    <h1>` + domain + `</h1>
    <p><?php echo "PHP is running."; ?></p>
  </body>
</html>
`
}

func nodePackageJSON(domain string) string {
	return `{
  "name": "` + domain + `",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node index.js"
  }
}
`
}

func nodeTemplate(port int) string {
	return `const http = require('http');

const port = process.env.PORT || ` + fmt.Sprintf("%d", port) + `;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Docklite Node Site</h1><p>Server is running.</p>');
});

server.listen(port, () => {
  console.log('Server running on port', port);
});
`
}
