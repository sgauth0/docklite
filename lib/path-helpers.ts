import fs from 'fs/promises';
import path from 'path';

const LEGACY_BASE_DIR = '/var/www/sites';

export class DocklitePathError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DocklitePathError';
    this.status = status;
  }
}

function getDockliteBaseDirs(): string[] {
  const baseDir = process.env.DOCKLITE_DATA_DIR || LEGACY_BASE_DIR;
  const bases = [baseDir];
  if (baseDir !== LEGACY_BASE_DIR) {
    bases.push(LEGACY_BASE_DIR);
  }
  return bases;
}

function isPathWithinBase(targetPath: string, basePath: string): boolean {
  return targetPath === basePath || targetPath.startsWith(`${basePath}${path.sep}`);
}

export async function resolveDocklitePath(
  inputPath: string,
  options: { mustExist?: boolean } = {}
): Promise<{ resolvedPath: string; baseDir: string }> {
  if (typeof inputPath !== 'string' || inputPath.trim() === '') {
    throw new DocklitePathError('Path is required', 400);
  }

  if (path.isAbsolute(inputPath)) {
    throw new DocklitePathError('Absolute paths are not allowed', 400);
  }

  if (inputPath.includes('\0')) {
    throw new DocklitePathError('Invalid path', 400);
  }

  const bases = getDockliteBaseDirs();
  let hasBase = false;
  let sawEscape = false;
  let sawNotFound = false;

  for (const baseDir of bases) {
    let baseReal: string;
    try {
      baseReal = await fs.realpath(baseDir);
      hasBase = true;
    } catch {
      continue;
    }

    const candidate = path.resolve(baseReal, inputPath);
    let targetReal: string;

    if (options.mustExist ?? true) {
      try {
        targetReal = await fs.realpath(candidate);
      } catch {
        sawNotFound = true;
        continue;
      }
    } else {
      const parent = path.dirname(candidate);
      try {
        const parentReal = await fs.realpath(parent);
        targetReal = path.join(parentReal, path.basename(candidate));
      } catch {
        sawNotFound = true;
        continue;
      }
    }

    if (!isPathWithinBase(targetReal, baseReal)) {
      sawEscape = true;
      continue;
    }

    return { resolvedPath: targetReal, baseDir: baseReal };
  }

  if (!hasBase) {
    throw new DocklitePathError('Configured base directory not found', 500);
  }
  if (sawEscape) {
    throw new DocklitePathError('Forbidden: Access outside allowed directory', 403);
  }
  if (sawNotFound) {
    throw new DocklitePathError('Path not found', 404);
  }

  throw new DocklitePathError('Invalid path', 400);
}

export async function ensureUserPathAccess(
  resolvedPath: string,
  baseDir: string,
  username: string,
  isAdmin: boolean
): Promise<void> {
  if (isAdmin) {
    return;
  }

  const userDir = path.join(baseDir, username);
  let userDirReal: string;
  try {
    userDirReal = await fs.realpath(userDir);
  } catch {
    throw new DocklitePathError('User directory not found', 404);
  }

  if (!isPathWithinBase(resolvedPath, userDirReal)) {
    throw new DocklitePathError('Forbidden: You can only access your own sites', 403);
  }
}

export function assertPathWithinBase(targetPath: string, basePath: string): void {
  if (!isPathWithinBase(targetPath, basePath)) {
    throw new DocklitePathError('Invalid path', 400);
  }
}
