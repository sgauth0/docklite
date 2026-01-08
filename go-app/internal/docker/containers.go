package docker

import (
	"context"
	"encoding/json"
	"io"
	"strings"

	"docklite-agent/internal/models"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
)

func (c *Client) ListContainers(ctx context.Context, all bool) ([]models.ContainerInfo, error) {
	containers, err := c.Client.ContainerList(ctx, container.ListOptions{All: all})
	if err != nil {
		return nil, err
	}
	results := make([]models.ContainerInfo, 0, len(containers))
	for _, item := range containers {
		name := ""
		if len(item.Names) > 0 {
			name = strings.TrimPrefix(item.Names[0], "/")
		}
		results = append(results, models.ContainerInfo{
			ID:      item.ID,
			Name:    name,
			Image:   item.Image,
			Created: item.Created,
			State:   item.State,
			Status:  item.Status,
			Labels:  item.Labels,
		})
	}
	return results, nil
}

func (c *Client) StartContainer(ctx context.Context, id string) error {
	return c.Client.ContainerStart(ctx, id, container.StartOptions{})
}

func (c *Client) StopContainer(ctx context.Context, id string) error {
	return c.Client.ContainerStop(ctx, id, container.StopOptions{})
}

func (c *Client) RestartContainer(ctx context.Context, id string) error {
	return c.Client.ContainerRestart(ctx, id, container.StopOptions{})
}

func (c *Client) ContainerLogs(ctx context.Context, id string, tail string) (string, error) {
	options := container.LogsOptions{ShowStdout: true, ShowStderr: true, Tail: tail}
	reader, err := c.Client.ContainerLogs(ctx, id, options)
	if err != nil {
		return "", err
	}
	defer reader.Close()
	bytes, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func (c *Client) ContainerStats(ctx context.Context, id string) (*models.ContainerStats, error) {
	stats, err := c.Client.ContainerStatsOneShot(ctx, id)
	if err != nil {
		return nil, err
	}
	defer stats.Body.Close()
	decoded, err := decodeStats(stats)
	if err != nil {
		return nil, err
	}
	return decoded, nil
}

func decodeStats(response types.ContainerStats) (*models.ContainerStats, error) {
	var stats types.StatsJSON
	if err := json.NewDecoder(response.Body).Decode(&stats); err != nil {
		return nil, err
	}
	cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
	systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)
	cpuPercent := 0.0
	if systemDelta > 0 && cpuDelta > 0 {
		cpuPercent = (cpuDelta / systemDelta) * float64(len(stats.CPUStats.CPUUsage.PercpuUsage)) * 100.0
	}
	memoryUsage := stats.MemoryStats.Usage
	memoryLimit := stats.MemoryStats.Limit
	memoryPercent := 0.0
	if memoryLimit > 0 {
		memoryPercent = (float64(memoryUsage) / float64(memoryLimit)) * 100.0
	}
	return &models.ContainerStats{
		CPUUsage:    cpuPercent,
		MemoryUsage: memoryUsage,
		MemoryLimit: memoryLimit,
		MemoryPct:   memoryPercent,
	}, nil
}

func (c *Client) InspectContainer(ctx context.Context, id string) (types.ContainerJSON, error) {
	return c.Client.ContainerInspect(ctx, id)
}
