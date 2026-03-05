# Lesson API Backend

This folder now includes a runnable starter backend for step 1:

- Fastify server bootstrap
- Route modules matching `openapi/lesson-api-v1.yaml`
- DB helpers for Postgres/Supabase
- Starter JWT auth utilities for wallet sessions

## Files

- `sql/0001_lesson_platform.sql`
- `openapi/lesson-api-v1.yaml`
- `src/server.mjs`
- `src/modules/content/routes.mjs`
- `src/modules/auth/routes.mjs`
- `src/modules/progress/routes.mjs`

## Quick Start

1. Install backend deps:

```bash
cd /Users/marcus/Projects/locked-in/backend
npm install
```

2. Create env:

```bash
cp .env.example .env
```

3. Set at least:

- `JWT_SECRET` (required)
- `DATABASE_URL` (optional for first boot; required for real data)
- `CORS_ALLOWED_ORIGINS` (comma-separated browser origins, optional but recommended)

4. Run API:

```bash
npm run dev
```

Server default: `http://localhost:3001`

## Implemented Endpoints (Step 1 Starter)

### Public content

- `GET /health`
- `GET /v1/content/version`
- `GET /v1/courses`
- `GET /v1/courses/:courseId/modules`
- `GET /v1/modules/:moduleId/lessons`
- `GET /v1/lessons/:lessonId`

### Auth

- `POST /v1/auth/challenge`
- `POST /v1/auth/verify`
- `POST /v1/auth/refresh`

### Progress (Bearer access token)

- `POST /v1/progress/lessons/:lessonId/start`
- `POST /v1/progress/lessons/:lessonId/submit`
- `GET /v1/progress/courses/:courseId`
- `GET /v1/progress/modules/:moduleId`

## Important Starter Notes

- If `DATABASE_URL` is missing, content/progress endpoints run in safe starter mode (empty reads, in-memory auth challenges).
- `POST /v1/auth/verify` currently includes a placeholder signature check. Replace with real Solana signature verification before production.
- Progress endpoints are wired for idempotent lesson completion upsert when DB is configured.

## Next Hardening Tasks

1. Replace placeholder signature verification with ed25519 wallet verification.
2. Persist auth challenges and refresh tokens in Postgres.
3. Add schema validation (Zod) and structured response typing from OpenAPI.
4. Add tests for each route module.
