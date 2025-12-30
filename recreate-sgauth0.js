const Docker = require('dockerode');
const { generateStaticTemplate } = require('./lib/templates/static.ts');
const Database = require('better-sqlite3');
const path = require('path');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const db = new Database(path.join(__dirname, 'data/docklite.db'));

async function recreateSite() {
  console.log('Recreating sgauth0.com container with fixed labels...\n');

  // Get site info
  const site = db.prepare('SELECT * FROM sites WHERE domain = ?').get('sgauth0.com');
  if (!site) {
    console.error('Site not found!');
    process.exit(1);
  }

  console.log('Site info:', {
    id: site.id,
    domain: site.domain,
    user_id: site.user_id,
    template_type: site.template_type
  });

  // Get code path
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(site.user_id);
  const codePath = `/var/www/sites/${user.username}/${site.domain}`;

  console.log('Code path:', codePath);

  // Generate container config with fixed labels
  const config = generateStaticTemplate({
    domain: site.domain,
    codePath: codePath,
    siteId: site.id
  });

  console.log('\nCreating container with labels:');
  Object.entries(config.Labels).forEach(([key, value]) => {
    if (key.startsWith('traefik')) {
      console.log(`  ${key}: ${value}`);
    }
  });

  // Create container
  const container = await docker.createContainer(config);
  console.log('\n✓ Container created:', container.id);

  // Start container
  await container.start();
  console.log('✓ Container started');

  // Update database with new container ID
  db.prepare('UPDATE sites SET container_id = ? WHERE id = ?').run(container.id, site.id);
  console.log('✓ Database updated');

  console.log('\n✓ Done! Container recreated successfully.');
  console.log('Traefik should pick it up automatically.');

  db.close();
}

recreateSite().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
