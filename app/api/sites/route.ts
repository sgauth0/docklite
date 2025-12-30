import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSitesByUser, createSite, getUserById, updateSiteContainerId } from '@/lib/db';
import { createContainer, pullImage } from '@/lib/docker';
import { generateStaticTemplate } from '@/lib/templates/static';
import { generatePhpTemplate } from '@/lib/templates/php';
import { generateNodeTemplate } from '@/lib/templates/node';
import { createSiteDirectory, createDefaultIndexFile, getSitePathByUserId } from '@/lib/site-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuth();
    const sites = getSitesByUser(user.userId, user.isAdmin);

    return NextResponse.json({ sites });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error listing sites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('--- NEW SITE REQUEST ---');
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { domain, template_type, user_id, create_default_files } = body;

    // Validate input
    if (!domain || !template_type) {
      return NextResponse.json(
        { error: 'Missing required fields: domain or template_type' },
        { status: 400 }
      );
    }

    // Security: Validate domain to prevent path traversal
    const isValidDomain = /^[a-zA-Z0-9.-]+$/.test(domain) && !domain.includes('..') && domain.length < 255;
    if (!isValidDomain) {
      return NextResponse.json(
        { error: 'Invalid domain format.' },
        { status: 400 }
      );
    }

    if (!['static', 'php', 'node'].includes(template_type)) {
      return NextResponse.json(
        { error: 'Invalid template_type. Must be: static, php, or node' },
        { status: 400 }
      );
    }

    // Only admin can create sites for other users
    const targetUserId = user.isAdmin && user_id ? user_id : user.userId;
    const targetUser = getUserById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      );
    }

    // 1. Prepare for container creation
    console.log('[SITE_CREATION] Preparing site directory...');
    const codePath = getSitePathByUserId(targetUserId, domain);
    await createSiteDirectory(targetUser.username, domain);
    if (create_default_files !== false) {
      await createDefaultIndexFile(codePath, domain, template_type as 'static' | 'php' | 'node');
    }
    console.log('[SITE_CREATION] Site directory prepared.');

    // 2. Create the site in the database first to get a real site ID
    console.log('[SITE_CREATION] Creating site record in database...');
    const site = createSite({
      domain,
      user_id: targetUserId,
      template_type,
      container_id: '', // Will be updated after container creation
    });
    console.log(`[SITE_CREATION] Site created with ID: ${site.id}`);

    // 3. Generate container config with real site ID
    console.log('[SITE_CREATION] Generating container config...');
    let containerConfig;
    let imageName;

    switch (template_type) {
      case 'static':
        containerConfig = generateStaticTemplate({ domain, codePath, siteId: site.id });
        imageName = 'nginx:alpine';
        break;
      case 'php':
        containerConfig = generatePhpTemplate({ domain, codePath, siteId: site.id });
        imageName = 'webdevops/php-nginx:8.2-alpine';
        break;
      case 'node':
        containerConfig = generateNodeTemplate({ domain, codePath, siteId: site.id });
        imageName = 'node:20-alpine';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid template type' },
          { status: 400 }
        );
    }
    console.log(`[SITE_CREATION] Container config generated for image: ${imageName}`);

    // 4. Pull image and create the container
    console.log('[SITE_CREATION] Pulling Docker image...');
    await pullImage(imageName);
    console.log('[SITE_CREATION] Image pulled. Creating container...');
    const containerId = await createContainer(containerConfig);
    console.log(`[SITE_CREATION] Container created with ID: ${containerId}`);

    // 5. Update the site with the container ID
    updateSiteContainerId(site.id, containerId);
    console.log(`[SITE_CREATION] Site updated with container ID`);

    return NextResponse.json({
      site,
    });
  } catch (error: any) {
    console.error('[SITE_CREATION_ERROR]', error);
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'An unexpected error occurred on the server.' },
      { status: 500 }
    );
  }
}
