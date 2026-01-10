import { spawn } from 'child_process';
import { getDatabaseById } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

interface RunPsqlParams {
  containerId: string;
  dbName: string;
  username: string;
  password: string;
  sql: string;
  format?: 'json' | 'raw';
  variables?: Record<string, string>;
}

export async function requireAdminDatabase(id: number) {
  const user = await requireAuth();
  if (!user.isAdmin) {
    throw new Error('Unauthorized');
  }

  const database = getDatabaseById(id);
  if (!database) {
    throw new Error('NotFound');
  }

  return database;
}

export async function runPsql({
  containerId,
  dbName,
  username,
  password,
  sql,
  format = 'raw',
  variables,
}: RunPsqlParams): Promise<string> {
  const args = [
    'exec',
    '-e',
    `PGPASSWORD=${password}`,
    containerId,
    'psql',
    '-U',
    username,
    '-d',
    dbName,
    '-v',
    'ON_ERROR_STOP=1',
    '-X',
  ];

  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      args.push('-v', `${key}=${value}`);
    });
  }

  if (format === 'json') {
    args.push('-t', '-A');
  }

  args.push('-c', sql);

  return new Promise((resolve, reject) => {
    const child = spawn('docker', args);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code && code !== 0) {
        reject(new Error(stderr.trim() || `psql exited with code ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}
