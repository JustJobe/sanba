# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SanBa (sanba.my) is an AI-powered photo restoration and colorization service. Users upload damaged/faded/B&W photos and restore them via OpenCV processing and Google Gemini AI. Credit-based pricing model.

## Build & Run Commands

### Production (Docker) — preferred
```bash
cd /root/sanba
docker compose up -d --build                    # rebuild all
docker compose build --no-cache frontend && docker compose up -d frontend  # frontend only
docker compose up -d --build backend             # backend only
docker compose logs -f backend                   # tail logs
docker compose ps                                # status
```
Use `docker compose` (v2), not `docker-compose`.

### Local Development
```bash
# Backend
cd /root/sanba/backend
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8002

# Frontend
cd /root/sanba/frontend
npm install
npm run dev
```

### Tests
```bash
cd /root/sanba/backend
pytest tests/test_api.py
pytest test_credit_system.py
```

## Architecture

**Stack**: FastAPI (Python) backend, Next.js 16 (TypeScript/React 19) frontend, SQLite, Docker, Nginx reverse proxy on DigitalOcean.

### Routing (Nginx)
- `/` → frontend (port 3000)
- `/api/v1` → backend (port 8002)
- `/files` → backend static file serving

### Backend (`backend/`)
- **main.py** — App init, CORS, middleware, DB migrations
- **database.py** — SQLAlchemy with SQLite (`thepurplebox.db`)
- **routers/jobs.py** — File upload, processing, AI repair/remaster, download (prefix: `/api/v1/jobs`)
- **routers/auth.py** — OTP email login via Mailjet, JWT auth, profile (prefix: `/api/v1/auth`)
- **routers/admin.py** — User/credit/incentive management (prefix: `/api/v1/admin`, requires `is_admin`)
- **services/restoration.py** — OpenCV pipeline: denoise, upscale, auto-detect color vs B&W, preview generation
- **services/ai_repair.py** — Gemini-based two-phase repair (analysis → generation), content policy handling with auto-refund
- **services/ai_remaster.py** — Gemini-based remaster, chains from repair output if available (discounted if repair done)
- **models/** — SQLAlchemy models: `sql_job`, `user`, `incentive`, `activity_log`, `system_setting`; Pydantic schemas in `job.py`

### Frontend (`frontend/`)
- **App Router** with pages: home/dashboard, login, profile, gallery, store, admin, FAQ
- **components/JobDashboard.tsx** — Core component: job list, status polling, process/repair/remaster actions (~43KB)
- **components/UploadZone.tsx** — Drag-drop multi-file upload
- **components/ComparisonSlider.tsx** — Before/after image slider
- **context/AuthContext.tsx** — Global auth state, token management
- **lib/api.ts** — Axios instance with `NEXT_PUBLIC_API_URL`
- **Styling**: Tailwind v4, custom theme (stone/amber/cream palette), fonts: Syne, Space Mono, Cormorant Garamond

### Gemini AI Models
Both AI Repair and AI Remaster use a two-phase pipeline:
- **Analysis phase**: `gemini-3-flash-preview` — evaluates damage/context with 8K thinking budget
- **Generation phase**: `gemini-3-pro-image-preview` — produces the output image
- Output resolution: Gemini returns ~800–1400px on the longest side regardless of input size
- Constants defined in `services/ai_repair.py` and `services/ai_remaster.py` (lines 26-28)

### Credit System
- New users: 10 credits (configurable via `system_settings`)
- All operation costs are admin-configurable via `system_settings` table (keys: `restore_cost`, `ai_repair_cost`, `ai_remaster_cost_full`, `ai_remaster_cost_discounted`)
- Defaults: 1 credit (restore), 4 credits (AI repair), 4 credits (AI remaster full), 3 credits (AI remaster discounted — repair already done)
- Public pricing endpoint: `GET /api/v1/jobs/pricing`
- Daily replenishment: 1 credit at UTC+8 midnight if balance < cap (configurable via `daily_credit_threshold`)
- Gemini content policy blocks → automatic full refund

### File Storage
Uploads stored at `backend/uploads/{job_id}/original/` and `backend/uploads/{job_id}/processed/`.

## CI/CD

GitHub Actions (`.github/workflows/deploy.yml`): pushes to `main` SSH into the droplet, detect changed directories, rebuild only affected Docker services.

## Other Services on This Server

A **Discourse forum** also runs on this droplet — installed at `/var/discourse/`, running as the `app` container on port 8080.

## Environment Variables (`.env` in project root)
`SECRET_KEY`, `MAILJET_API_KEY`, `MAILJET_API_SECRET`, `MAILJET_SENDER_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `NEXT_PUBLIC_API_URL`
