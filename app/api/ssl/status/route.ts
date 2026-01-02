import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import fs from 'fs/promises';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface TraefikRouter {
  name: string;
  rule: string;
  tls?: {
    certResolver: string;
  };
  provider: string;
}

interface CertificateEntry {
  domain: {
    main: string;
    sans?: string[];
  };
  certificate: string; // base64
}

interface SslStatus {
  domain: string;
  hasSSL: boolean;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  status: 'valid' | 'expiring' | 'expired' | 'none';
}

const DEFAULT_ACME_PATHS = [
  process.env.ACME_PATH,
  '/var/lib/traefik/acme.json',
  '/etc/traefik/acme.json',
  '/home/stella/projects/ioi_docker/traefik/letsencrypt/acme.json',
  '/home/stella/traefik/letsencrypt/acme.json',
  '/data/traefik/acme.json',
].filter(Boolean) as string[];

async function loadAcme(): Promise<CertificateEntry[] | null> {
  for (const candidate of DEFAULT_ACME_PATHS) {
    try {
      const raw = await fs.readFile(candidate, 'utf8');
      const json = JSON.parse(raw);
      if (json?.letsencrypt?.Certificates) {
        return json.letsencrypt.Certificates as CertificateEntry[];
      }
      if (json?.Certificates) {
        return json.Certificates as CertificateEntry[];
      }
    } catch {
      // try next path
    }
  }
  return null;
}

function getHostsFromRule(rule: string): string[] {
  const matches = [...rule.matchAll(/Host\(`([^`]+)`\)/g)];
  if (matches.length === 0) return [];
  const hostChunk = matches.map(m => m[1]); // may include comma-separated entries
  const hosts: string[] = [];
  hostChunk.forEach(chunk => {
    chunk.split(',').forEach(h => hosts.push(h.trim()));
  });
  return hosts.filter(Boolean);
}

function buildCertMap(entries: CertificateEntry[] | null): Map<string, CertificateEntry> {
  const map = new Map<string, CertificateEntry>();
  if (!entries) return map;
  for (const entry of entries) {
    if (entry.domain?.main) {
      map.set(entry.domain.main, entry);
      (entry.domain.sans || []).forEach((san) => map.set(san, entry));
    }
  }
  return map;
}

function getExpiry(certEntry: CertificateEntry | undefined): { expiryDate: string | null; daysUntilExpiry: number | null; status: SslStatus['status'] } {
  if (!certEntry?.certificate) {
    return { expiryDate: null, daysUntilExpiry: null, status: 'none' };
  }
  try {
    const x509 = new crypto.X509Certificate(Buffer.from(certEntry.certificate, 'base64'));
    const expiryDate = new Date(x509.validTo);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let status: SslStatus['status'] = 'valid';
    if (daysUntilExpiry < 0) status = 'expired';
    else if (daysUntilExpiry < 30) status = 'expiring';
    return { expiryDate: expiryDate.toISOString(), daysUntilExpiry, status };
  } catch (err) {
    console.error('Failed to parse certificate:', err);
    return { expiryDate: null, daysUntilExpiry: null, status: 'none' };
  }
}

export async function GET() {
  try {
    await requireAuth();

    // Fetch routers from Traefik API
    const response = await fetch('http://localhost:8080/api/http/routers');
    const routers: TraefikRouter[] = await response.json();

    // Filter only DockLite-managed routers (provider=docker, name contains 'docklite')
    const dockliteRouters = routers.filter(
      (router) =>
        router.provider === 'docker' &&
        router.name.toLowerCase().includes('docklite')
    );

    const acmeEntries = await loadAcme();
    const certMap = buildCertMap(acmeEntries);

    const statuses: SslStatus[] = [];

    for (const router of dockliteRouters) {
      const hosts = getHostsFromRule(router.rule);
      if (hosts.length === 0) continue;

      const hasTls = !!router.tls && router.tls.certResolver === 'letsencrypt';

      for (const host of hosts) {
        if (!hasTls) {
          statuses.push({
            domain: host,
            hasSSL: false,
            expiryDate: null,
            daysUntilExpiry: null,
            status: 'none',
          });
          continue;
        }

        const certEntry = certMap.get(host) || certMap.get(host.replace('www.', ''));
        const { expiryDate, daysUntilExpiry, status } = getExpiry(certEntry);

        statuses.push({
          domain: host,
          hasSSL: !!certEntry,
          expiryDate,
          daysUntilExpiry,
          status: certEntry ? status : 'none',
        });
      }
    }

    return NextResponse.json({ sites: statuses });
  } catch (error: any) {
    console.error('Error fetching SSL status:', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
