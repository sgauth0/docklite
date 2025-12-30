import Docker from 'dockerode';

export interface PhpTemplateConfig {
  domain: string;
  codePath: string;
  siteId: number;
  userId: number;
  folderId?: number;
}

export function generatePhpTemplate(config: PhpTemplateConfig): Docker.ContainerCreateOptions {
  const containerName = `docklite-site${config.siteId}-${config.domain.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const sanitizedDomain = config.domain.replace(/[^a-zA-Z0-9]/g, '-');

  // Using a PHP-FPM + Nginx image for simplicity
  // In production, you might want separate containers
  return {
    Image: 'webdevops/php-nginx:8.2-alpine',
    name: containerName,
    ExposedPorts: {
      '80/tcp': {}
    },
    Env: [
      'WEB_DOCUMENT_ROOT=/app',
      'PHP_DISPLAY_ERRORS=1',
      'PHP_MEMORY_LIMIT=256M',
      'PHP_MAX_EXECUTION_TIME=300',
      'PHP_POST_MAX_SIZE=50M',
      'PHP_UPLOAD_MAX_FILESIZE=50M'
    ],
    HostConfig: {
      Binds: [
        `${config.codePath}:/app:rw`
      ],
      PortBindings: {
        '80/tcp': [{ HostPort: '0' }] // Auto-assign port
      },
      RestartPolicy: {
        Name: 'unless-stopped'
      },
      NetworkMode: 'ioi_docker_imoverit_network' // Connect to Traefik network
    },
    Labels: {
      'docklite.managed': 'true',
      'docklite.site.id': config.siteId.toString(),
      'docklite.domain': config.domain,
      'docklite.type': 'php',
      'docklite.user.id': config.userId.toString(),
      'docklite.folder.id': config.folderId?.toString() || '',
      // Traefik labels
      'traefik.enable': 'true',
      [`traefik.http.routers.docklite-${sanitizedDomain}.rule`]: `Host(\`${config.domain}\`)`,
      [`traefik.http.routers.docklite-${sanitizedDomain}.entrypoints`]: 'websecure',
      [`traefik.http.routers.docklite-${sanitizedDomain}.tls`]: 'true',
      [`traefik.http.routers.docklite-${sanitizedDomain}.tls.certresolver`]: 'letsencrypt',
      [`traefik.http.services.docklite-${sanitizedDomain}.loadbalancer.server.port`]: '80',
    }
  };
}
