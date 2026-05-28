# GoPass PM

> Plataforma de gestión de proyectos y tareas — Prueba Técnica Senior Full Stack

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)
![NestJS](https://img.shields.io/badge/NestJS-10.x-e0234e?logo=nestjs)
![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker)

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
