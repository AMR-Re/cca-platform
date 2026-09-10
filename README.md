# CCA Platform

A multi-tenant School CCA (Co-Curricular Activity) Management Platform for
schools and activity providers in the UAE.

The product focuses on the operational core first:

```
Students → Activities → Enrollments → Sessions → Attendance → Performance → Reports → Parent Portal
```

Booking and online payments are **future phases**. The architecture is
prepared for them but they are not implemented yet. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full technical write-up.

> **Phase 1 status:** foundation only. No business modules (students,
> activities, enrollments, attendance, RBAC, auth, booking, payments) exist
> yet. This phase proves out the monorepo, i18n, design system, API
> conventions, logging, and infrastructure that every later phase builds on.

## Project structure

```
cca-platform/
├── apps/
│   ├── web/                 # Next.js 16 (App Router) frontend
│   └── api/                 # NestJS backend
├── packages/
│   └── shared-types/        # TS contracts shared by web and api
├── docker/
│   ├── docker-compose.yml   # local dev orchestration
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   ├── .env.example
│   └── nginx/nginx.conf     # reverse-proxy config, HTTPS-ready
├── docs/
├── ARCHITECTURE.md
└── README.md
```

## Prerequisites

- Node.js 20+ and npm 10+
- Docker + Docker Compose (for the containerized local setup)
- PostgreSQL 16 (only if you run the API outside Docker)

## Getting started (local, without Docker)

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Point DATABASE_URL in apps/api/.env at a running PostgreSQL instance,
#    then generate the Prisma client and apply migrations
npm run prisma:generate
npm run prisma:migrate

# 4. Build shared types once (both apps depend on the compiled output)
npm run build:shared

# 5. Run both apps in dev mode (separate terminals)
npm run dev:api    # http://localhost:4000/api/v1
npm run dev:web    # http://localhost:3000
```

## Getting started (Docker)

```bash
cp docker/.env.example docker/.env
# edit docker/.env if you want non-default ports/credentials

npm run docker:up      # builds and starts postgres, api, web
npm run docker:down    # stops everything
```

To also run the Nginx reverse proxy in front of both services:

```bash
docker compose -f docker/docker-compose.yml --profile with-nginx up --build
```

Nginx then listens on `http://localhost:8080` and proxies `/api/*` to the
API and everything else to the web app.

## Common commands

| Command | Description |
|---|---|
| `npm run build` | Build shared-types, then api, then web |
| `npm run lint` | Lint web and api |
| `npm run format` / `format:check` | Prettier write / check across the repo |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Run Prisma migrations in dev |
| `npm run docker:up` / `docker:down` | Start/stop the Docker Compose stack |

## Environment variables

See [`ARCHITECTURE.md`](./ARCHITECTURE.md#environment-variables) for the
full reference. Each app also ships its own `.env.example`:

- `apps/api/.env.example`
- `apps/web/.env.example`
- `docker/.env.example` (Docker Compose orchestration variables)

## Internationalization

The app is English-first with full Arabic/RTL support (`en`, `ar`), routed
via `next-intl` (`/en/...`, `/ar/...`). See
[`ARCHITECTURE.md`](./ARCHITECTURE.md#internationalization-i18n) for the
strategy.

## Known environment limitation (documented, not a code defect)

Prisma's CLI (`generate`, `validate`, `migrate`) downloads a query engine
binary from `binaries.prisma.sh` on first use. In network-restricted
environments (including the sandbox this project was scaffolded in) that
host may not be reachable, and these commands will fail with a `403` while
fetching the engine binary. This is a Prisma tooling requirement, not an
issue with the schema or code — the commands work normally on a developer
machine or CI runner with standard internet access. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md#known-issues--environment-limitations)
for details.

## What's deferred to later phases

Authentication & RBAC, the full multi-tenant domain model (organizations,
schools, providers, students, activities, enrollments, sessions,
attendance, performance, reports), the parent portal, booking, waiting
lists, invoices, payments, notifications, and MIS/SIS integrations. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md#deferred-to-later-phases) for the
full list and rationale.
