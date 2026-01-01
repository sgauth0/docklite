# Traefik Integration for DockLite

DockLite uses Traefik as a reverse proxy to automatically route traffic to your sites and handle SSL certificates via Let's Encrypt.

## Quick Start

1. **Run the setup script:**
   ```bash
   ./setup-traefik.sh
   ```

2. **Update your email in `.env.traefik`:**
   ```bash
   nano .env.traefik
   # Change ACME_EMAIL to your actual email
   ```

3. **Start Traefik:**
   ```bash
   docker-compose -f docker-compose.traefik.yml --env-file .env.traefik up -d
   ```

4. **Verify it's running:**
   ```bash
   docker ps | grep docklite-traefik
   ```

## How It Works

### Network Architecture

- All site containers connect to the `docklite_network` Docker network
- Traefik listens on ports 80 (HTTP) and 443 (HTTPS)
- HTTP traffic is automatically redirected to HTTPS
- Traefik reads Docker labels to configure routing

### Automatic Routing

When you create a site in DockLite, the container is automatically labeled with:
- `traefik.enable=true` - Enables Traefik for this container
- `traefik.http.routers.docklite-{domain}.rule=Host({domain})` - Routes traffic based on domain
- `traefik.http.routers.docklite-{domain}.tls=true` - Enables TLS
- `traefik.http.routers.docklite-{domain}.tls.certresolver=letsencrypt` - Uses Let's Encrypt for certificates

### SSL Certificates

Traefik automatically:
- Requests SSL certificates from Let's Encrypt
- Renews certificates before they expire
- Stores certificates in `traefik-data/letsencrypt/acme.json`

## Dashboard Access

The Traefik dashboard is available at:
- URL: `https://traefik.localhost` (or configure your own domain)
- Port: `8080` (accessible at `http://localhost:8080`)

⚠️ **Security Note**: In production, you should:
1. Change the dashboard domain from `traefik.localhost`
2. Enable authentication (see commented middleware in docker-compose.traefik.yml)
3. Or disable the dashboard entirely by removing `--api.dashboard=true`

## Configuration Files

- `docker-compose.traefik.yml` - Traefik container configuration
- `.env.traefik` - Environment variables (email for Let's Encrypt)
- `traefik-data/letsencrypt/acme.json` - SSL certificate storage
- `traefik-data/logs/` - Traefik access logs

## Management Commands

### Start Traefik
```bash
docker-compose -f docker-compose.traefik.yml --env-file .env.traefik up -d
```

### Stop Traefik
```bash
docker-compose -f docker-compose.traefik.yml down
```

### View Logs
```bash
docker-compose -f docker-compose.traefik.yml logs -f
```

### Restart Traefik
```bash
docker-compose -f docker-compose.traefik.yml restart
```

## Troubleshooting

### Sites not accessible
1. Check if Traefik is running: `docker ps | grep docklite-traefik`
2. Check if site container is on the network: `docker inspect {container-name} | grep docklite_network`
3. Check Traefik logs: `docker logs docklite-traefik`

### SSL certificate issues
1. Verify your domain points to your server's IP address
2. Ensure ports 80 and 443 are open in your firewall
3. Check ACME logs in Traefik logs
4. Delete `traefik-data/letsencrypt/acme.json` and restart Traefik to retry

### Network conflicts
If the `docklite_network` conflicts with existing networks:
1. Stop all DockLite containers
2. Remove the network: `docker network rm docklite_network`
3. Edit `docker-compose.traefik.yml` to use a different network name
4. Update all container templates in `lib/templates/*.ts` to use the new network name

## Migration from Old Setup

If you were using `ioi_docker_imoverit_network`:

1. **Stop all containers:**
   ```bash
   docker stop $(docker ps -a -q --filter "label=docklite.managed=true")
   ```

2. **Run the setup script:**
   ```bash
   ./setup-traefik.sh
   ```

3. **Start Traefik:**
   ```bash
   docker-compose -f docker-compose.traefik.yml --env-file .env.traefik up -d
   ```

4. **Reconnect containers to new network:**
   ```bash
   # For each container
   docker network connect docklite_network {container-name}
   docker network disconnect ioi_docker_imoverit_network {container-name}
   docker restart {container-name}
   ```

   Or simply recreate them through the DockLite UI - new sites will automatically use the correct network.

## Production Checklist

- [ ] Update `ACME_EMAIL` in `.env.traefik` with your real email
- [ ] Configure dashboard authentication or disable public access
- [ ] Ensure DNS records point to your server
- [ ] Open ports 80 and 443 in firewall
- [ ] Back up `traefik-data/letsencrypt/acme.json` regularly
- [ ] Set up log rotation for `traefik-data/logs/`
