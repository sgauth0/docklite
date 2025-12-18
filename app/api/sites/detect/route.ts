import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { detectSitesInContainers } from '@/lib/site-detector';
import { getSiteByContainerId } from '@/lib/db';

export async function GET() {
  try {
    await requireAuth();

    const detectedSites = await detectSitesInContainers();

    // Check which sites are already in DockLite
    const sitesWithStatus = detectedSites.map(site => {
      const existingSite = getSiteByContainerId(site.containerId);
      return {
        ...site,
        alreadyImported: !!existingSite,
        existingSiteId: existingSite?.id,
      };
    });

    return NextResponse.json({ sites: sitesWithStatus });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error detecting sites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
