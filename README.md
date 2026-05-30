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
- CORS allowlist from env
- Global throttling and auth endpoint throttling
- Bcrypt password hashing
- Refresh token rotation + revocation
- One-time password reset tokens with expiry
- Generic forgot-password response to prevent user enumeration

## Health Endpoints

- GET /api/v1/health/live
- GET /api/v1/health/ready

Readiness checks:

- PostgreSQL connectivity
- Redis connectivity

## Setup

### Prerequisites

- Node.js 20+
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
- APP_URL
- FRONTEND_URL
- BACKEND_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GITHUB_CLIENT_ID
- GITHUB_CLIENT_SECRET
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET

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

## CI/CD Ready

Workflow includes:

- lint
- typecheck
- backend tests
- frontend build
- docker image build

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
