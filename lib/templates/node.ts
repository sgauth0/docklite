import Docker from 'dockerode';

export interface NodeTemplateConfig {
  domain: string;
  codePath: string;
  port?: number; // Internal port the Node app listens on (default: 3000)
}

export function generateNodeTemplate(config: NodeTemplateConfig): Docker.ContainerCreateOptions {
  const containerName = `docklite-${config.domain.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const internalPort = config.port || 3000;

  return {
    Image: 'node:20-alpine',
    name: containerName,
    WorkingDir: '/app',
    Cmd: ['npm', 'start'],
    ExposedPorts: {
      [`${internalPort}/tcp`]: {}
    },
    Env: [
      'NODE_ENV=production',
      `PORT=${internalPort}`
    ],
    HostConfig: {
      Binds: [
        `${config.codePath}:/app:rw`
      ],
      PortBindings: {
        [`${internalPort}/tcp`]: [{ HostPort: '0' }] // Auto-assign port
      },
      RestartPolicy: {
        Name: 'unless-stopped'
      }
    },
    Labels: {
      'docklite.managed': 'true',
      'docklite.domain': config.domain,
      'docklite.type': 'node',
    }
  };
}
