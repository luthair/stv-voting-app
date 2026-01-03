# Deployment

## Overview

This guide covers deploying the Voting App to production using Docker on a self-hosted server, or using Vercel.

## Architecture

```
┌─────────────────────────────────────────┐
│  Your Server (Docker)                   │
│  ┌───────────────────────────────────┐  │
│  │  voting-app container             │  │
│  │  (Next.js on port 3000)           │  │
│  └───────────────────────────────────┘  │
│                  ↓                      │
│         Reverse Proxy / Tunnel          │
└─────────────────────────────────────────┘
                   ↓
            ┌──────────────┐
            │ Convex Cloud │  (Managed)
            └──────────────┘
```

**Note**: Convex is a cloud service - you only host the Next.js frontend.

## Docker Deployment

### Prerequisites

- Docker and Docker Compose installed
- Domain with SSL (via Cloudflare Tunnel, Traefik, or similar)

### Files Included

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build using Bun |
| `docker-compose.yml` | Container orchestration |
| `.dockerignore` | Exclude unnecessary files |

### Step 1: Deploy Convex to Production

```bash
cd next-app
bunx convex deploy --prod
```

Note the production URL provided.

### Step 2: Create Environment File

Create `.env` on your server:

```env
# Convex Production
CONVEX_DEPLOYMENT=your-production-deployment
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Discord Bot
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_SERVER_ID=your_server_id
DISCORD_ADMIN_ROLE_IDS=role_id_1,role_id_2
DISCORD_ANNOUNCEMENTS_CHANNEL_ID=your_channel_id

# NextAuth
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://voting.yourdomain.com
```

### Step 3: Build and Run

```bash
# Build and start container
docker compose up -d --build

# View logs
docker compose logs -f

# Check health
curl http://localhost:3000/api/health
```

### Step 4: Configure Reverse Proxy

**Cloudflare Tunnel** example (`config.yml`):
```yaml
ingress:
  - hostname: voting.yourdomain.com
    service: http://localhost:3000
```

**Traefik** labels (add to docker-compose.yml):
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.voting.rule=Host(`voting.yourdomain.com`)"
  - "traefik.http.routers.voting.tls=true"
```

### Step 5: Update Discord OAuth

In Discord Developer Portal, add redirect URI:
```
https://voting.yourdomain.com/api/auth/callback/discord
```

## Docker Commands Reference

```bash
# Start
docker compose up -d --build

# Stop
docker compose down

# Rebuild
docker compose up -d --build --force-recreate

# View logs
docker compose logs -f voting-app

# Shell into container
docker compose exec voting-app sh

# Check health
curl http://localhost:3000/api/health
```

## Health Check

The app exposes `/api/health` endpoint:
```json
{"status":"ok","timestamp":"2024-01-15T12:00:00.000Z"}
```

## Troubleshooting

### Container won't start
- Check logs: `docker compose logs`
- Verify all env vars are set
- Ensure NEXT_PUBLIC_CONVEX_URL is accessible

### Discord OAuth fails
- Verify redirect URI matches exactly
- Check NEXTAUTH_URL matches your domain
- Ensure NEXTAUTH_SECRET is set

### Convex connection issues
- Run `bunx convex deploy --prod` to verify deployment
- Check NEXT_PUBLIC_CONVEX_URL in browser console

