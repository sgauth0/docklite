import Docker from 'dockerode';

export interface StaticTemplateConfig {
  domain: string;
  codePath: string;
  siteId: number;
  userId: number;
  folderId?: number;
}

export function generateStaticTemplate(config: StaticTemplateConfig): Docker.ContainerCreateOptions {
  const containerName = `docklite-site${config.siteId}-${config.domain.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const sanitizedDomain = config.domain.replace(/[^a-zA-Z0-9]/g, '-'); // Remove ALL special chars including dots

  return {
    Image: 'nginx:alpine',
    name: containerName,
    ExposedPorts: {
      '80/tcp': {}
    },
    HostConfig: {
      Binds: [
        `${config.codePath}:/usr/share/nginx/html:ro`
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
      'docklite.type': 'static',
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
