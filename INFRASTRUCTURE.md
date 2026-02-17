# Droplet Infrastructure & Deployment Guide

## Overview

This droplet hosts two distinct applications served via Nginx acting as a reverse proxy to Docker containers.

### Hosted Sites

1.  **Sanba (Photo Restoration)**
    *   **Domain**: `sanba.my`
    *   **Frontend**: Next.js (Port `3000`)
    *   **Backend**: FastAPI (Port `8002`)
    *   **Service Name**: `sanba-frontend`, `sanba-backend`

2.  **Fishing Network (Forum)**
    *   **Domain**: `mfn.fishing.net.my`
    *   **Platform**: Discourse
    *   **Port**: `8080`
    *   **Container**: `local_discourse/app`

---

## Directory Structure

*   **/root/sanba/**: Main project directory.
    *   `docker-compose.yml`: Defines `frontend` and `backend` services.
    *   `frontend/`: Next.js source code.
    *   `backend/`: Python/FastAPI source code.

---

## Nginx Configuration

Nginx is installed on the host and proxies traffic to the containers.

**Config Location**: `/etc/nginx/sites-enabled/`

### 1. sanba.my (`sanba.conf`)
*   `/` -> `http://localhost:3000` (Frontend)
*   `/api/v1` -> `http://localhost:8002` (Backend)
*   `/files` -> `http://localhost:8002` (Backend Static Files)

### 2. mfn.fishing.net.my (`discourse.conf`)
*   `/` -> `http://localhost:8080` (Discourse Container)

---

## Deployment Commands

**Working Directory**: `/root/sanba`

⚠️ **Important**: This server uses **Docker Compose v2**. Use `docker compose` (with a space), NOT `docker-compose` (with a hyphen).

### Rebuild & Deploy Frontend
Use this when you update `globals.css` or React components.

```bash
cd /root/sanba
# Build with no cache to ensure fresh assets (e.g., Tailwind config)
docker compose build --no-cache frontend
# Restart the container
docker compose up -d frontend
```

### Rebuild & Deploy Backend
Use this when you update Python files (`routers`, `services`).

```bash
cd /root/sanba
docker compose up -d --build backend
```

### Check Logs
```bash
# Frontend Logs
docker compose logs -f frontend

# Backend Logs
docker compose logs -f backend
```

### Check Status
```bash
docker compose ps
```

---

## Troubleshooting

### "Command not found"
If `docker-compose` command is not found, remember to use `docker compose` (v2).

### Changes not showing?
The frontend container might be using a cached build layer. Force a clean build:
```bash
cd /root/sanba
docker compose build --no-cache frontend
docker compose up -d frontend
```
