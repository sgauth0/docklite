#!/bin/bash

echo "🚀 DockLite Traefik Setup"
echo "=========================="
echo ""

# Create directories for Traefik data
echo "📁 Creating Traefik data directories..."
mkdir -p traefik-data/letsencrypt
mkdir -p traefik-data/logs
chmod 600 traefik-data/letsencrypt

# Create acme.json with proper permissions
touch traefik-data/letsencrypt/acme.json
chmod 600 traefik-data/letsencrypt/acme.json

# Check if network exists
if docker network inspect docklite_network >/dev/null 2>&1; then
  echo "✓ Network 'docklite_network' already exists"
else
  echo "🌐 Creating Docker network 'docklite_network'..."
  docker network create docklite_network
  echo "✓ Network created"
fi

# Check if .env file exists
if [ ! -f .env.traefik ]; then
  echo "📝 Creating .env.traefik file..."
  cat > .env.traefik << EOF
# Email for Let's Encrypt notifications
ACME_EMAIL=admin@localhost

# Change this to your actual email for production!
# ACME_EMAIL=your-email@example.com
EOF
  echo "✓ Created .env.traefik - Please update ACME_EMAIL with your email"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start Traefik:"
echo "  docker-compose -f docker-compose.traefik.yml --env-file .env.traefik up -d"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.traefik.yml logs -f"
echo ""
echo "To stop Traefik:"
echo "  docker-compose -f docker-compose.traefik.yml down"
echo ""
echo "⚠️  Important: Update ACME_EMAIL in .env.traefik before using in production!"
echo ""
