import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';

interface TraefikRouter {
  name: string;
  rule: string;
  tls?: {
    certResolver: string;
  };
  provider: string;
}

interface SslStatus {
  domain: string;
  hasSSL: boolean;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  status: 'valid' | 'expiring' | 'expired' | 'none';
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

    // Get SSL status for each DockLite site
    const sslStatuses: SslStatus[] = await Promise.all(
      dockliteRouters.map(async (router) => {
        // Extract domain from rule (e.g., "Host(`example.com`)" -> "example.com")
        const domainMatch = router.rule.match(/Host\(`([^`]+)`\)/);
        const domain = domainMatch ? domainMatch[1] : 'unknown';

        if (!router.tls || router.tls.certResolver !== 'letsencrypt') {
          return {
            domain,
            hasSSL: false,
            expiryDate: null,
            daysUntilExpiry: null,
            status: 'none' as const,
          };
        }

        // Get certificate expiry from acme.json
        try {
          const { stdout } = await execAsync(
            `sudo cat /home/stella/projects/ioi_docker/traefik/letsencrypt/acme.json | ` +
            `jq -r '.letsencrypt.Certificates[] | select(.domain.main == "${domain}") | .certificate' | ` +
            `base64 -d | openssl x509 -noout -enddate`
          );

          const expiryMatch = stdout.match(/notAfter=(.+)/);
          if (expiryMatch) {
            const expiryDate = new Date(expiryMatch[1]);
            const now = new Date();
            const daysUntilExpiry = Math.floor(
              (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            let status: 'valid' | 'expiring' | 'expired' = 'valid';
            if (daysUntilExpiry < 0) {
              status = 'expired';
            } else if (daysUntilExpiry < 30) {
              status = 'expiring';
            }

            return {
              domain,
              hasSSL: true,
              expiryDate: expiryDate.toISOString(),
              daysUntilExpiry,
              status,
            };
          }
        } catch (error) {
          console.error(`Error getting cert for ${domain}:`, error);
        }

        return {
          domain,
          hasSSL: true,
          expiryDate: null,
          daysUntilExpiry: null,
          status: 'valid' as const,
        };
      })
    );

    return NextResponse.json({ sites: sslStatuses });
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
