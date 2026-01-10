package models

type ContainerInfo struct {
	ID        string            `json:"id"`
	Name      string            `json:"name"`
	Image     string            `json:"image"`
	Created   string            `json:"created"`
	State     string            `json:"state"`
	Status    string            `json:"status"`
	Labels    map[string]string `json:"labels"`
}

type ContainerStats struct {
	CPUUsage    float64 `json:"cpuUsage"`
	MemoryUsage uint64  `json:"memoryUsage"`
	MemoryLimit uint64  `json:"memoryLimit"`
	MemoryPct   float64 `json:"memoryPct"`
}
