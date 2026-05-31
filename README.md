# Tasku - Production Ready Project Management SaaS

Tasku is a full-stack project management platform built as a production-grade monorepo with real-time collaboration, AI-assisted task workflows, enterprise authentication, and deployment-ready infrastructure.

## Frontend, Backend, Database, Realtime, AI

- Frontend: React 18, TypeScript, Vite, TanStack Query, Zustand, Tailwind
- Backend: NestJS 10, TypeScript, Prisma, Swagger/OpenAPI
- Database: PostgreSQL 16
- Realtime: Socket.IO rooms per user and project
- AI: Cloudflare Workers AI task generation flows

## Architecture

### Frontend

- Feature-oriented structure under apps/web/src
- Route guards for guest/app access control
- Error boundary with friendly fallback UI
- Auth UX with premium visual consistency across landing/login/register
- OAuth social sign-in (Google and GitHub), provider architecture prepared for Microsoft/Discord/LinkedIn

### Backend

- Modular NestJS domains: auth, users, projects, tasks, dashboard, AI, health
- DTO validation at boundaries with class-validator
- Global exception filter and response transform interceptor
- JWT access + refresh rotation
- OAuth account linking with extensible provider support
- Password reset with secure hashed one-time tokens

### Database

- Prisma schema with relational model and enums
- Soft delete strategy for projects/tasks/comments
- Optimized indexes for filtering and pagination
- OAuthAccount, PasswordResetToken, Notification, EmailPreview models

### AI

- Structured prompts and schema validation
- Regeneration flows for task sections
- Confirm-and-persist AI output to real task entities

### Realtime

- Socket.IO namespace with authenticated connections
- Project rooms for scoped updates
- Events emitted on task and member lifecycle changes

## Authentication System

### Email/Password

- Register/login with bcrypt hashing
- Account enumeration-safe forgot password responses
- Rotating refresh tokens stored hashed in DB

### OAuth Social Login

- Continue with Google
- Continue with GitHub
- Backend provider architecture prepared for:
  - Google
  - GitHub
  - Microsoft
  - Discord
  - LinkedIn

### OAuth Data Model

- User
- OAuthAccount (multi-provider per user)

This allows future account linking without schema redesign.

## Password Reset Flow

1. POST /auth/forgot-password
2. Secure random token generated server-side
3. Only token hash is persisted
4. HTML email template generated
5. POST /auth/reset-password with raw token
6. Token validated for expiration and one-time use
7. Password updated and all refresh sessions invalidated

## Local Email Preview Mode

Environment strategy:

- SEND_REAL_EMAIL=false -> no real emails are sent
- Email previews are stored in DB and available for local testing

Preview endpoints:

- GET /api/v1/auth/email-previews
- GET /api/v1/auth/email-previews/:id

Optional runtime integration with Zavu SDK is supported when installed and configured.

## API Documentation

- Swagger UI: /api/docs
- OpenAPI JSON: /api/docs-json

Documented domains include:

- Auth
- Users
- Projects
- Workflows
- Tasks
- Notifications
- Activity
- AI
- Settings
- Health

## Database Performance and Indexes

Added/verified indexes:

- tasks(project_id)
- tasks(status)
- tasks(assignee_id)
- tasks(priority)
- tasks(due_date)
- project_members(project_id)
- project_members(user_id)
- activity_logs(project_id)
- activity_logs(created_at)
- notifications(user_id)
- notifications(read_at)

Additional guidance:

- Use pagination for list endpoints
- Validate query plans with EXPLAIN ANALYZE for high-volume datasets

## Security Hardening

- Helmet enabled
- Strict security headers (HSTS in production, frame deny, no-sniff, referrer policy)
- CORS allowlist from env
- Global throttling and endpoint-specific throttling for auth, AI and invitations
- Bcrypt password hashing
- Refresh token rotation + revocation
- One-time password reset tokens with expiry
- Generic forgot-password response to prevent user enumeration
- WebSocket auth + project membership authorization for room/presence events
- Environment validation on startup (app fails fast when critical vars are invalid)

## Health Endpoints

- GET /api/v1/health
- GET /api/v1/health/db
- GET /api/v1/health/realtime
- GET /api/v1/health/ws
- GET /api/v1/health/email
- GET /api/v1/health/live
- GET /api/v1/health/ready

Readiness checks:

- PostgreSQL connectivity
- Redis connectivity

## Setup

### Prerequisites

- Node.js 20+ (20 or 22 LTS recommended for production parity)
- npm 10+
- Docker + Docker Compose

### Install

```bash
npm install
```

### Environment

Copy and complete env files:

- .env.example (reference)
- apps/api/.env
- apps/web/.env

Required production variables include:

- SEND_REAL_EMAIL
- ZAVU_API_KEY
- JWT_SECRET
- APP_URL
- FRONTEND_URL
- BACKEND_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- OAUTH_REDIRECT_ALLOWLIST

Frontend deploy variables:

- VITE_API_URL
- VITE_WS_URL
- VITE_APP_URL
- VITE_SUPPORTED_LOCALES

Backend deploy variables for separated frontend/backend domains:

- CORS_ORIGINS
- FRONTEND_URL
- COOKIE_SAME_SITE
- COOKIE_DOMAIN

Cloudflare Pages deploy variables:

- CLOUDFLARE_ACCOUNT_ID
- CLOUDFLARE_API_TOKEN
- CLOUDFLARE_PAGES_PROJECT

### Database

```bash
npm run db:migrate
npm run db:seed
```

### Development

```bash
npm run dev
```

### Docker

```bash
docker compose up --build
```

Services:

- frontend
- backend
- postgres
- redis

## Deploy Frontend

```bash
cd apps/web
npm run deploy
```

This command builds `dist/` and deploys to Cloudflare Pages using Wrangler.

Production frontend builds now require explicit backend endpoints:

- VITE_API_URL=https://api.example.com/api/v1
- VITE_WS_URL=https://api.example.com
- VITE_APP_URL=https://app.example.com

SPA routing is production-safe via `public/_redirects`:

- `/projects/:id`
- `/tasks/:id`
- `/settings`

will resolve to `index.html` instead of 404.

## Deploy Backend

```bash
cd apps/api
npm run deploy
```

This command:

1. Validates required environment variables.
2. Builds and starts Docker services (`postgres`, `redis`, `api`) using `docker-compose.prod.yml`.
3. Runs Prisma migrations (`prisma migrate deploy`).
4. Waits for backend health check success.

Notes for separated production deployments:

- `apps/api/docker-compose.prod.yml` now builds from `apps/api` directly and keeps API port mapping aligned with `API_PORT`.
- Refresh cookie behavior is configurable with `COOKIE_SAME_SITE` and `COOKIE_DOMAIN` for cross-origin frontend/backend deployments.
- `API_ENV_FILE` can be exported to point Compose and the API service at a non-default environment file.

Root one-command deploy:

```bash
npm run deploy
```

One-command production refresh for code or env changes:

```bash
cd apps/api
npm run update:prod
```

This command re-reads the env file, forces Docker recreation, reapplies migrations, and waits for health before returning.

## CI/CD Ready

Workflow includes:

- lint
- typecheck
- backend tests
- frontend build
- docker image build

Validated in this workspace:

- `npm run typecheck -w apps/api`
- `npm run build -w apps/api`
- `npm run build -w apps/web`
- `docker compose --project-name gopass_api_probe --env-file /tmp/gopass-api-prod.env -f apps/api/docker-compose.prod.yml up -d --build`
- `GET /api/v1/health`
- `GET /api/v1/health/ws`
- `GET /api/v1/health/ready`

## Testing

Current baseline tests cover:

- Auth
- Projects
- Tasks
- Workflows (status transition behavior)
- AI controller integration path

## Feature Highlights

- Realtime collaboration with presence and websocket task updates
- AI generation for task title/description/subtasks/priority
- Kanban workflow management
- Notification experiences
- Dashboard analytics

## UX Consistency

- Shared design tokens and component system
- Auth pages aligned visually with landing style
- Dark mode support
- Responsive behavior across app shell and auth flows

## Deployment Profiles

- local
- staging
- production

Recommended production setup:

- run Prisma migrate deploy on startup pipeline
- use managed Postgres and Redis
- set strict CORS origins
- enable SEND_REAL_EMAIL=true with valid ZAVU_API_KEY

## Screenshots Placeholders

- [placeholder] Landing
- [placeholder] Login
- [placeholder] Register
- [placeholder] Dashboard
- [placeholder] Kanban
- [placeholder] Calendar
- [placeholder] AI Drawer
- [placeholder] Settings

## Technical Decisions

### Why NestJS

- Strong module boundaries, dependency injection, and built-in patterns for scalable API architecture.

### Why PostgreSQL

- Mature relational consistency, transactions, indexing, and operational reliability for collaborative SaaS workloads.

### Why Socket.IO

- Room semantics, automatic reconnection, and practical realtime delivery model for multi-user project updates.

### Why Cloudflare Workers AI

- Low-latency managed inference with straightforward API integration for structured AI task assistance.
