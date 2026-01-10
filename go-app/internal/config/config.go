package config

import "os"

const (
	defaultListenAddr      = ":3000"
	defaultDockerSocket    = "unix:///var/run/docker.sock"
	defaultDatabasePath    = "data/docklite.db"
	defaultNextjsURL       = "http://localhost:3001"
)

type Config struct {
	ListenAddr       string
	DockerSocketPath string
	DatabasePath     string
	Token            string
	NextjsURL        string
}

func Load() Config {
	return Config{
		ListenAddr:       getEnv("LISTEN_ADDR", defaultListenAddr),
		DockerSocketPath: getEnv("DOCKER_SOCKET_PATH", defaultDockerSocket),
		DatabasePath:     getEnv("DATABASE_PATH", defaultDatabasePath),
		Token:            getEnv("DOCKLITE_TOKEN", ""),
		NextjsURL:        getEnv("NEXTJS_URL", defaultNextjsURL),
	}
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
