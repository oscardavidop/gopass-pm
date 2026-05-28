# GoPass PM

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/NestJS-10.x-e0234e?logo=nestjs&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/React-18.x-61dafb?logo=react&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Socket.IO-4.7-010101?logo=socket.io&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white&style=for-the-badge" />
</p>

<p align="center">
  <strong>Enterprise-grade project management SaaS — Senior Full Stack Technical Assessment</strong>
</p>

<p align="center">
  Real-time Kanban · Command Palette · WebSocket collaboration · Calendar view · Role-based access · Premium dark UI
</p>

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Highlights](#feature-highlights)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Real-Time System](#real-time-system)
6. [Data Model](#data-model)
7. [Getting Started](#getting-started)
8. [Environment Variables](#environment-variables)
9. [API Reference](#api-reference)
10. [Technical Decisions](#technical-decisions)
11. [Project Structure](#project-structure)

---

## Overview

GoPass PM is a modern, production-ready SaaS project management platform built for a Senior Full Stack evaluation. It demonstrates enterprise-level architecture, clean code, and thoughtful UX — the kind of product a well-funded startup would ship.

The application is fully functional end-to-end: create projects, invite team members, manage tasks via a drag-and-drop Kanban board, view deadlines on a calendar, receive live notifications when teammates update tasks, and use the blazing-fast command palette to navigate anywhere instantly.

---

## Feature Highlights

### Core
| Feature | Details |
|---|---|
| **Authentication** | JWT access (15 min) + refresh rotation (7 days), bcrypt, HttpOnly cookies |
| **RBAC** | Three roles: `ADMIN` / `MANAGER` / `USER` with declarative guards |
| **Projects** | Full CRUD, status, color coding, member management, progress tracking |
| **Kanban Board** | Drag & drop via DnD Kit, inline quick-add, colored status columns |
| **Task Management** | Priority levels, assignees, due dates, tags, soft delete |
| **Activity Logs** | Full audit trail per task |
| **Comments** | Threaded comments per task with author info |
| **Dashboard** | KPI cards, trend indicators, Recharts area + pie charts |

### Premium UX
| Feature | Details |
|---|---|
| **Command Palette** | `⌘K` / `Ctrl+K` — search projects, navigate pages, trigger actions |
| **Real-Time** | Socket.IO WebSockets — live task updates across all collaborators |
| **Notification System** | In-app notification center with unread count, dismiss, mark-all-read |
| **Calendar View** | FullCalendar month/week view — all tasks with due dates at a glance |
| **Page Transitions** | Framer Motion `AnimatePresence` — smooth fade+slide between routes |
| **Empty States** | Animated empty states with contextual CTAs |
| **Dark Design System** | Custom CSS vars, glass morphism, gradient tokens, shadow-glow |
| **Sidebar** | Spring-animated active indicator, collapsible, tooltips in mini mode |
| **Profile & Settings** | Avatar, bio, password change, theme picker, notification toggles |

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend                      Backend                          │
│  ─────────────────────         ─────────────────────────────    │
│  React 18 + TypeScript         NestJS 10 + TypeScript           │
│  Vite 5                        Prisma ORM 5                     │
│  TanStack Query 5              PostgreSQL 16                     │
│  Zustand                       Redis (throttle / sessions)      │
│  Framer Motion                 Socket.IO 4.7 (WebSockets)       │
│  DnD Kit                       Passport.js + JWT                │
│  Radix UI + Tailwind 3         Class-validator + Class-transformer│
│  Recharts                      Swagger / OpenAPI 3              │
│  FullCalendar                  Docker + Docker Compose          │
│  cmdk (Command Palette)                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
gopass-pm/ (npm workspaces monorepo)
├── apps/
│   ├── api/                        # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # JWT strategy, guards, decorators
│   │   │   │   ├── users/          # Profile management
│   │   │   │   ├── projects/       # Projects CRUD + members
│   │   │   │   ├── tasks/          # Tasks, comments, activity
│   │   │   │   ├── events/         # Socket.IO WebSocket gateway
│   │   │   │   └── dashboard/      # Aggregated stats
│   │   │   └── shared/             # Filters, interceptors, database
│   │   └── prisma/                 # Schema, migrations, seed
│   └── web/                        # React Frontend
│       └── src/
│           ├── components/
│           │   ├── ui/             # Design system (Button, Input, Drawer…)
│           │   └── shared/         # Sidebar, Navbar, NotificationBell, EmptyState
│           ├── features/
│           │   ├── projects/       # ProjectCard, ProjectDrawer, KanbanBoard
│           │   └── tasks/          # TaskCard, KanbanColumn, TaskDrawer
│           ├── hooks/              # useProjects, useTasks, useSocket, useAuth…
│           ├── layouts/            # AppLayout (WebSocket init, CommandPalette)
│           ├── pages/              # Dashboard, Projects, Calendar, Profile…
│           ├── store/              # auth.store, ui.store, notifications.store
│           ├── services/           # Axios API clients by domain
│           └── utils/              # Formatters, cn(), color utilities
└── docker-compose.yml
```

### Applied Patterns

**Backend:**
- Feature modules (each domain is an isolated NestJS module)
- DTO + class-validator at HTTP boundary
- Declarative guards (`JwtAuthGuard`, `RolesGuard`)
- Global exception filter → uniform error shape
- Transform interceptor → `{ data, meta }` envelope
- Soft delete (`deletedAt`) on projects and tasks

**Frontend:**
- Feature-based directory structure (domain, not file type)
- Server state via TanStack Query (queries + mutations + optimistic updates)
- Client state minimal via Zustand (auth, UI prefs, notifications)
- Compound components for complex UI (Drawer, CommandPalette, Kanban)

---

## Real-Time System

```
Browser ──── Socket.IO ──── /events namespace ──── NestJS Gateway
                                                          │
                                               JWT verified on connect
                                                          │
                                               client.join(`user:{id}`)
                                               client.join(`project:{id}`)
                                                          │
                                           task:created / task:updated / task:deleted
                                                          │
                                               TanStack Query invalidation
                                               + Notification store push
```

**Flow:**
1. On `AppLayout` mount, `useSocket()` hook connects to `/events` with the JWT access token
2. On `ProjectDetailPage` mount, the hook emits `join:project {id}` to subscribe to project-scoped events
3. When any user creates / updates / deletes a task via REST, `TasksService` calls `EventsGateway.emit*()`
4. All clients in that project room receive the event → TanStack Query cache is invalidated → UI re-renders live
5. New task creation also pushes an `AppNotification` to the Zustand store → bell badge updates with animation

---

## Data Model

```
User ─────────────────── owns ──────── Project (*)
User ─────────────────── member ────── ProjectMember (*)
ProjectMember ──────────── links ────── Project ← → User
Project ────────────────── has ──────── Task (*)
User ─────────────────── assignee ──── Task (*)
Task ─────────────────── has ──────── Comment (*)
Task ─────────────────── has ──────── ActivityLog (*)
User ─────────────────── owns ──────── RefreshToken (*)
```

**Enums:**
- `Role`: ADMIN | MANAGER | USER
- `ProjectStatus`: ACTIVE | ON_HOLD | COMPLETED | ARCHIVED
- `TaskStatus`: TODO | IN_PROGRESS | REVIEW | DONE
- `Priority`: LOW | MEDIUM | HIGH | CRITICAL

---

## Getting Started

### Prerequisites
- Node.js 20+  
- Docker + Docker Compose  
- npm 10+

### Quick Start (development)

```bash
# 1. Clone
git clone <repo-url> gopass-pm && cd gopass-pm

# 2. Start PostgreSQL + Redis
npm run docker:dev

# 3. Configure environment
cp .env.example apps/api/.env
cp .env.example apps/web/.env

# 4. Install dependencies
npm install

# 5. Run migrations and seed
npm run db:migrate
npm run db:seed

# 6. Start dev servers (API + Web concurrently)
npm run dev
```

- **API**: `http://localhost:3001` (Swagger: `/docs`)  
- **Web**: `http://localhost:3000`

### Production (Docker)

```bash
cp .env.example apps/api/.env
# Fill in production secrets in apps/api/.env
npm run docker:prod
```

### Demo Accounts (seeded)

| Email | Password | Role |
|---|---|---|
| admin@gopass.dev | Admin123! | ADMIN |
| manager@gopass.dev | Manager123! | MANAGER |
| user@gopass.dev | User123! | USER |

---

## Environment Variables

See [`.env.example`](.env.example) for the full reference.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis URL |
| `JWT_ACCESS_SECRET` | Signing secret for access tokens |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens |
| `JWT_ACCESS_EXPIRES` | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRES` | Refresh token TTL (default: `7d`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `VITE_API_URL` | API base URL for frontend |
| `VITE_WS_URL` | WebSocket server URL for frontend |

---

## API Reference

Swagger UI: `http://localhost:3001/docs`

```
Auth
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/auth/refresh
  POST /api/v1/auth/logout

Users
  GET  /api/v1/users/me
  PATCH /api/v1/users/me

Projects
  GET    /api/v1/projects          ?search, status, page, limit
  POST   /api/v1/projects
  GET    /api/v1/projects/:id
  PATCH  /api/v1/projects/:id
  DELETE /api/v1/projects/:id

Tasks
  GET    /api/v1/projects/:id/tasks   ?status, priority, assigneeId, search
  POST   /api/v1/projects/:id/tasks
  PATCH  /api/v1/tasks/:id
  PATCH  /api/v1/tasks/:id/status
  DELETE /api/v1/tasks/:id
  GET    /api/v1/tasks/:id/activity
  POST   /api/v1/tasks/:id/comments

Dashboard
  GET /api/v1/dashboard/stats
  GET /api/v1/dashboard/activity

WebSocket (/events namespace)
  → join:project  { projectId }
  ← task:created  { task }
  ← task:updated  { task }
  ← task:deleted  { id }
```

---

## Technical Decisions

### NestJS over raw Express
NestJS provides dependency injection, module system, and decorators out-of-the-box — reducing boilerplate for guards, pipes, and filters. For an enterprise-level assessment, it's the right signal.

### Prisma over TypeORM
Prisma generates TypeScript types directly from the schema (zero drift), has deterministic migrations, and a dramatically faster query engine. Its `$transaction` API makes multi-query operations safe.

### TanStack Query + Zustand (not Redux)
React Query owns all server state (fetching, caching, invalidation). Zustand holds only ephemeral UI state (theme, sidebar, notifications). This mirrors how Vercel, Linear, and Loom structure their state — minimal, predictable, fast.

### Socket.IO over raw WebSocket
Socket.IO adds room-based broadcasting, automatic reconnection, and namespace isolation with minimal API surface. The backend `EventsGateway` verifies the JWT on handshake — no separate auth flow needed.

### JWT in Authorization header (access) + HttpOnly cookie (refresh)
Short-lived access tokens (15 min) travel as `Bearer` headers — compatible with SPA and mobile. Long-lived refresh tokens (7 days) in `HttpOnly; Secure; SameSite=Strict` cookies — protected from XSS.

### Feature-based frontend structure
`features/projects/` + `features/tasks/` keeps domain logic co-located. Deleting a feature means deleting one directory, not hunting across `components/`, `hooks/`, `utils/`.

### Soft delete everywhere
`deletedAt` timestamp on projects and tasks preserves audit history and referential integrity without exposing deleted records to users.

---

## Project Structure

```
apps/api/src/
├── modules/
│   ├── auth/         guards/, strategies/, decorators/, dto/
│   ├── users/        users.service.ts, users.controller.ts
│   ├── projects/     dto/, projects.service.ts
│   ├── tasks/        dto/, tasks.service.ts  ← emits WebSocket events
│   ├── events/       events.gateway.ts       ← Socket.IO rooms
│   └── dashboard/
└── shared/
    ├── database/     prisma.service.ts
    ├── filters/      http-exception.filter.ts
    └── interceptors/ transform.interceptor.ts

apps/web/src/
├── components/
│   ├── ui/           Button, Input, Drawer, Avatar, Badge, ConfirmDialog,
│   │                 CommandPalette, Select, Tooltip
│   └── shared/       Sidebar, Navbar, NotificationBell, EmptyState
├── features/
│   ├── projects/     ProjectCard, ProjectDrawer
│   └── tasks/        KanbanBoard, KanbanColumn, TaskCard, TaskDrawer
├── hooks/            useAuth, useProjects, useTasks, useSocket, useTheme
├── layouts/          AppLayout (global WS + CMD+K), AuthLayout
├── pages/            Dashboard, Projects, ProjectDetail, Calendar, Profile, Settings
├── store/            auth.store, ui.store, notifications.store
├── services/         api.ts, projects.service.ts, tasks.service.ts
└── utils/            cn, formatters, colors
```

---

## Scripts

```bash
npm run dev           # Start API + Web concurrently (watch mode)
npm run docker:dev    # Start PostgreSQL + Redis via Docker
npm run db:migrate    # Apply Prisma migrations
npm run db:seed       # Seed demo data
npm run db:studio     # Open Prisma Studio (GUI)
npm run db:reset      # Reset DB + re-seed
npm run build         # Production build (both apps)
npm run test          # Backend unit tests
npm run lint          # ESLint across monorepo
```

---

## License

MIT — For technical evaluation purposes only.

---

## Índice

1. [Visión general](#visión-general)
2. [Stack tecnológico](#stack-tecnológico)
3. [Arquitectura](#arquitectura)
4. [Modelo de datos](#modelo-de-datos)
5. [Primeros pasos](#primeros-pasos)
6. [Variables de entorno](#variables-de-entorno)
7. [API Reference](#api-reference)
8. [Decisiones técnicas](#decisiones-técnicas)
9. [Estructura del proyecto](#estructura-del-proyecto)

---

## Visión general

GoPass PM es una aplicación SaaS de gestión de proyectos y tareas que demuestra arquitectura empresarial, buenas prácticas y código limpio en un stack moderno.

**Funcionalidades principales:**

- Autenticación con JWT + Refresh Tokens y RBAC (Admin / Manager / User)
- CRUD completo de proyectos con estados, fechas y miembros
- Tablero Kanban con drag & drop para tareas
- Dashboard con métricas y gráficos de actividad
- Tiempo real via WebSockets (actualización en vivo de tareas)
- Auditoría de cambios por tarea
- Dark mode + diseño responsive

---

## Stack tecnológico

| Capa       | Tecnología                                    |
|------------|-----------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, TailwindCSS       |
| Estado     | Zustand + TanStack Query                      |
| UI         | Shadcn/UI, Framer Motion, Recharts            |
| Backend    | NestJS, TypeScript, Prisma ORM                |
| Base datos | PostgreSQL 16                                 |
| Cache      | Redis (sesiones, throttle)                    |
| Auth       | JWT Access + Refresh, bcrypt, RBAC            |
| Infra      | Docker Compose, GitHub Actions                |

---

## Arquitectura

```
gopass-pm/
├── apps/
│   ├── api/                  # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules (auth, users, projects, tasks, dashboard)
│   │   │   ├── shared/       # Filtros, interceptors, guards, pipes reutilizables
│   │   │   └── config/       # Configuración de entorno tipada
│   │   └── prisma/           # Schema, migraciones, seed
│   └── web/                  # React Frontend
│       └── src/
│           ├── features/     # Lógica de negocio por dominio
│           ├── components/   # Design system propio
│           ├── hooks/        # Hooks React Query
│           ├── store/        # Estado global Zustand
│           └── services/     # Capa de acceso a API
├── docker-compose.yml
└── docker-compose.dev.yml
```

### Patrones aplicados

**Backend:**
- **Feature modules** — cada dominio es un módulo NestJS independiente
- **Repository pattern** — acceso a datos desacoplado del servicio
- **DTO + ValidationPipe** — validación y transformación en capa HTTP
- **Guards** — autenticación y autorización declarativa
- **Exception filters** — respuestas de error uniformes
- **Interceptors** — logging y transformación de respuestas

**Frontend:**
- **Feature-based architecture** — código por dominio, no por tipo
- **Custom hooks** — lógica de servidor encapsulada con React Query
- **Zustand** — estado global mínimo (solo auth + UI preferences)
- **Optimistic updates** — UX fluida en el Kanban

---

## Modelo de datos

```
User (1) ──── (*) Project [owner]
User (1) ──── (*) ProjectMember
Project (1) ── (*) Task
User (1) ──── (*) Task [assignee]
Task (1) ──── (*) Comment
Task (1) ──── (*) ActivityLog
User (1) ──── (*) RefreshToken
```

Enums:
- **Role**: `ADMIN | MANAGER | USER`
- **ProjectStatus**: `ACTIVE | ON_HOLD | COMPLETED | ARCHIVED`
- **TaskStatus**: `TODO | IN_PROGRESS | REVIEW | DONE`
- **Priority**: `LOW | MEDIUM | HIGH | CRITICAL`

---

## Primeros pasos

### Prerequisitos

- Node.js 20+
- Docker + Docker Compose
- npm 10+

### Inicio rápido (desarrollo local)

```bash
# 1. Clonar repositorio
git clone <repo-url> gopass-pm
cd gopass-pm

# 2. Levantar servicios (PostgreSQL + Redis)
npm run docker:dev

# 3. Configurar variables de entorno
cp .env.example apps/api/.env
cp .env.example apps/web/.env

# 4. Instalar dependencias
npm install

# 5. Ejecutar migraciones y seed
npm run db:migrate
npm run db:seed

# 6. Iniciar en modo desarrollo
npm run dev
```

La API estará en `http://localhost:3001` y la UI en `http://localhost:3000`.

### Producción con Docker

```bash
cp .env.example apps/api/.env
# Editar apps/api/.env con valores de producción

npm run docker:prod
```

### Cuentas demo (seed)

| Email                  | Password    | Rol     |
|------------------------|-------------|---------|
| admin@gopass.dev       | Admin123!   | ADMIN   |
| manager@gopass.dev     | Manager123! | MANAGER |
| user@gopass.dev        | User123!    | USER    |

---

## Variables de entorno

Ver [.env.example](.env.example) para la lista completa.

### Críticas para producción

| Variable               | Descripción                          |
|------------------------|--------------------------------------|
| `DATABASE_URL`         | Connection string PostgreSQL          |
| `JWT_ACCESS_SECRET`    | Secret firmado de tokens de acceso   |
| `JWT_REFRESH_SECRET`   | Secret firmado de refresh tokens     |
| `CORS_ORIGINS`         | Orígenes permitidos (separados por ,)|

---

## API Reference

Swagger UI disponible en `http://localhost:3001/docs` con todos los endpoints documentados.

### Endpoints principales

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

GET    /api/v1/users/me
PATCH  /api/v1/users/me

GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
PATCH  /api/v1/projects/:id
DELETE /api/v1/projects/:id

GET    /api/v1/projects/:id/tasks
POST   /api/v1/projects/:id/tasks
PATCH  /api/v1/tasks/:id
PATCH  /api/v1/tasks/:id/status
DELETE /api/v1/tasks/:id
GET    /api/v1/tasks/:id/activity

GET    /api/v1/dashboard/stats
GET    /api/v1/dashboard/activity
```

---

## Decisiones técnicas

### NestJS sobre Express puro

NestJS provee estructura, inversión de dependencias y módulos out-of-the-box. Para una prueba que debe demostrar arquitectura enterprise, NestJS evita la burocracia de montar guardianes, pipes y filtros manualmente.

### Prisma sobre TypeORM / Sequelize

Prisma genera tipos TypeScript directamente desde el schema, elimina ORMs con decoradores y provee migraciones deterministas. El Query Engine es notoriamente más rápido en producción.

### Zustand + TanStack Query (no Redux)

Redux añade boilerplate innecesario cuando React Query gestiona todo el estado del servidor. Zustand cubre el estado global de UI (tema, sidebar) con una API mínima. Esta combinación es la que adoptan Vercel, Linear y Loom internamente.

### JWT Access + Refresh en cookies HttpOnly

Los refresh tokens se almacenan en cookies `HttpOnly; Secure; SameSite=Strict` para protección contra XSS. Los access tokens (15 min) viajan como Bearer en los headers de Authorization.

### Soft delete

Proyectos y tareas usan `deletedAt` (soft delete) para mantener integridad referencial e historial de auditoría sin perder datos.

### Feature-based en Frontend

Organizar por dominio (`features/projects/`, `features/tasks/`) en lugar de por tipo (`components/`, `hooks/`) reduce el acoplamiento y facilita la eliminación de features sin "limpieza arqueológica".

---

## Estructura del proyecto

```
apps/api/src/
├── config/
│   ├── app.config.ts
│   ├── database.config.ts
│   └── jwt.config.ts
├── modules/
│   ├── auth/
│   │   ├── strategies/
│   │   ├── guards/
│   │   ├── decorators/
│   │   └── dto/
│   ├── users/
│   │   ├── dto/
│   │   └── users.repository.ts
│   ├── projects/
│   │   ├── dto/
│   │   └── projects.repository.ts
│   ├── tasks/
│   │   ├── comments/
│   │   ├── dto/
│   │   └── tasks.repository.ts
│   └── dashboard/
├── shared/
│   ├── database/
│   ├── filters/
│   ├── interceptors/
│   └── pipes/
└── main.ts

apps/web/src/
├── components/
│   ├── ui/              # Design system: Button, Input, Modal, Badge…
│   └── shared/          # Navbar, Sidebar, EmptyState, ErrorBoundary
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── projects/
│   └── tasks/           # Kanban board con drag & drop
├── hooks/               # Custom hooks React Query por dominio
├── layouts/             # AppLayout, AuthLayout
├── pages/               # Route-level components
├── routes/              # React Router config + guards
├── services/            # Axios API clients
├── store/               # Zustand stores
├── types/               # TypeScript interfaces compartidas
└── utils/               # Helpers, formateadores, constantes
```

---

## Scripts útiles

```bash
npm run dev              # Levanta API + Web en modo watch
npm run docker:dev       # Inicia PostgreSQL + Redis en Docker
npm run db:migrate       # Aplica migraciones Prisma
npm run db:seed          # Carga datos de prueba
npm run db:studio        # Abre Prisma Studio
npm run db:reset         # Resetea BD y re-seedea
npm run test             # Corre tests del backend
npm run lint             # ESLint en todo el monorepo
```

---

## Licencia

MIT — Uso exclusivo para evaluación técnica.
