import Docker from 'dockerode';

export interface StaticTemplateConfig {
  domain: string;
  codePath: string;
}

export function generateStaticTemplate(config: StaticTemplateConfig): Docker.ContainerCreateOptions {
  const containerName = `docklite-${config.domain.replace(/[^a-zA-Z0-9]/g, '-')}`;

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
      }
    },
    Labels: {
      'docklite.managed': 'true',
      'docklite.domain': config.domain,
      'docklite.type': 'static',
    }
  };
}
