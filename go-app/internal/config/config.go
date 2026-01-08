package config

import "os"

const (
	defaultListenAddr      = ":8081"
	defaultDockerSocket    = "unix:///var/run/docker.sock"
	defaultDatabasePath    = "data/docklite.db"
)

type Config struct {
	ListenAddr      string
	DockerSocketPath string
	DatabasePath    string
}

func Load() Config {
	return Config{
		ListenAddr:       getEnv("LISTEN_ADDR", defaultListenAddr),
		DockerSocketPath: getEnv("DOCKER_SOCKET_PATH", defaultDockerSocket),
		DatabasePath:     getEnv("DATABASE_PATH", defaultDatabasePath),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
