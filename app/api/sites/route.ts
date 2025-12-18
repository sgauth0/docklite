import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSitesByUser, createSite, getUserById } from '@/lib/db';
import { createContainer, pullImage } from '@/lib/docker';
import { generateStaticTemplate } from '@/lib/templates/static';
import { generatePhpTemplate } from '@/lib/templates/php';
import { generateNodeTemplate } from '@/lib/templates/node';
import { createSiteDirectory, createDefaultIndexFile, getSitePathByUserId } from '@/lib/site-helpers';

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
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { domain, template_type, user_id, create_default_files } = body;

    // Validate input
    if (!domain || !template_type) {
      return NextResponse.json(
        { error: 'Missing required fields: domain, template_type' },
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

    // Generate standardized code path: /var/www/sites/{username}/{domain}/
    const codePath = getSitePathByUserId(targetUserId, domain);

    // Create directory structure
    await createSiteDirectory(targetUser.username, domain);

    // Optionally create default index file
    if (create_default_files !== false) {
      await createDefaultIndexFile(codePath, domain, template_type as 'static' | 'php' | 'node');
    }

    // Generate container config based on template
    let containerConfig;
    let imageName;

    switch (template_type) {
      case 'static':
        containerConfig = generateStaticTemplate({ domain, codePath });
        imageName = 'nginx:alpine';
        break;
      case 'php':
        containerConfig = generatePhpTemplate({ domain, codePath });
        imageName = 'webdevops/php-nginx:8.2-alpine';
        break;
      case 'node':
        containerConfig = generateNodeTemplate({ domain, codePath });
        imageName = 'node:20-alpine';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid template type' },
          { status: 400 }
        );
    }

    // Pull image if it doesn't exist
    await pullImage(imageName);

    // Create container
    const containerId = await createContainer(containerConfig);

    // Save to database
    const site = createSite({
      domain,
      container_id: containerId,
      user_id: targetUserId,
      template_type,
      code_path: codePath,
    });

    return NextResponse.json({
      site,
      path: codePath,
      message: `Site created at ${codePath}`
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating site:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create site' },
      { status: 500 }
    );
  }
}
