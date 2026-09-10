# Architecture

This document describes the foundation built in **Phase 1** of the CCA
Platform and the reasoning behind each decision. It is meant to stay
accurate as later phases add business modules on top of this foundation.

## 1. Project structure

```
cca-platform/
├── apps/
│   ├── web/          Next.js 16 (App Router), TypeScript, Tailwind v4
│   └── api/           NestJS, TypeScript, Prisma
├── packages/
│   └── shared-types/  TS contracts shared between web and api
├── docker/
│   ├── docker-compose.yml
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   ├── .env.example
│   └── nginx/nginx.conf
├── docs/
├── README.md
└── ARCHITECTURE.md
```

**Monorepo tool: npm workspaces.** Two apps plus one shared package don't
yet justify a build-orchestration tool like Turborepo or Nx. npm 10
(already required for this stack) handles workspace linking and script
delegation natively. This should be revisited if/when build times or
cross-package task graphs become painful - not before.

## 2. Apps and packages

### `packages/shared-types`

Plain TypeScript, compiled with `tsc` to `dist/` and consumed by both apps
as `@cca/shared-types` via workspace linking. It currently holds:

- `ApiResponse<T>` / `ApiSuccessResponse<T>` / `ApiErrorResponse` / `ApiError`
  / `ApiFieldError` / `PaginationMeta` - the response envelope contract.
- `PlatformRole` - the seven platform role identifiers, as a **naming
  contract only**. No authorization logic lives here; RBAC is Phase 3+.
- `ErrorCode` - the catalogue of stable, machine-readable error codes.

This package intentionally contains no business/domain types yet
(no `Student`, `Activity`, etc.) - those are designed in Phase 2 once the
data model is defined, so the contract isn't locked in prematurely.

### `apps/api` (NestJS)

Standard Nest CLI project layout plus:

```
src/
├── common/
│   ├── exceptions/app.exception.ts       # AppException + subclasses
│   ├── filters/all-exceptions.filter.ts  # global exception -> envelope
│   ├── interceptors/transform.interceptor.ts # success -> envelope
│   └── pipes/validation-exception.factory.ts # class-validator -> ApiFieldError[]
├── config/env.validation.ts               # fail-fast env var validation
├── health/health.controller.ts            # GET /api/v1/health
├── prisma/prisma.service.ts               # PrismaClient lifecycle wrapper
├── app.module.ts
└── main.ts
```

No controllers/services beyond `health` exist yet - there is deliberately
no business domain code in Phase 1.

### `apps/web` (Next.js)

```
src/
├── app/
│   └── [locale]/
│       ├── layout.tsx    # <html lang/dir>, NextIntlClientProvider, QueryProvider
│       └── page.tsx      # placeholder landing page
├── components/
│   ├── ui/               # hand-written shadcn/ui primitives (button, card)
│   └── providers/query-provider.tsx
├── i18n/
│   ├── routing.ts        # locales, default locale, RTL locale list
│   ├── navigation.ts     # locale-aware Link/router/usePathname
│   └── request.ts        # next-intl request config
├── lib/
│   ├── utils.ts           # cn() class merge helper
│   └── api-client.ts      # fetch wrapper that unwraps ApiResponse<T>
├── messages/
│   ├── en.json
│   └── ar.json
└── middleware.ts          # next-intl locale routing middleware
```

## 3. Frontend architecture

- **App Router**, all routes nested under `app/[locale]/...` so every page
  is locale-aware from the start; there is no separate non-localized route
  tree to maintain in parallel.
- **Data fetching**: TanStack Query, with a `QueryClient` created inside a
  client component (`QueryProvider`) via `useState` so it isn't shared
  across requests/users on the server.
- **Forms**: React Hook Form + Zod are installed and ready; no forms exist
  yet since there's no business data to submit in Phase 1.
- **Tables**: TanStack Table is installed and ready for the first data
  grid in Phase 2 (e.g. student/enrollment lists).
- **Design system**: shadcn/ui, "new-york" style, zinc base palette, OKLCH
  design tokens in `globals.css`. Only `Button` and `Card` exist so far -
  enough to prove the token/theming pipeline works end to end.
  - **The shadcn CLI cannot run inside this build sandbox** because it
    fetches component definitions from `ui.shadcn.com`, which is not on
    the sandbox's network allowlist. `Button` and `Card` were therefore
    hand-written to match shadcn's standard output exactly (same class
    names, same `cva` variant structure, same `cn()` helper), and
    `components.json` is in place so `npx shadcn add <component>` works
    normally on a developer machine or CI runner with normal internet
    access.
- **Fonts**: a system font stack (`ui-sans-serif, system-ui, ...` with
  Arabic fallbacks) rather than `next/font/google`. Two reasons, not one:
  `fonts.googleapis.com` isn't reachable from network-restricted build
  environments (this sandbox included), and Geist (the default
  create-next-app font) has no Arabic glyphs anyway, so it wasn't a fit
  for an Arabic-first requirement regardless. A proper self-hosted,
  Arabic-capable webfont (e.g. Noto Sans Arabic / IBM Plex Sans Arabic via
  `next/font/local`) is a visual-design decision deferred to whichever
  phase does the real UI design pass, not silently picked now.

## 4. Backend architecture

- **Global exception filter** (`AllExceptionsFilter`) catches everything
  and normalizes it into `ApiErrorResponse`. 500-class errors are logged
  with full detail via pino but never leak internal messages to the
  client - the client always gets a stable `code` plus a safe message.
- **Global transform interceptor** (`TransformInterceptor`) wraps every
  successful response in `ApiSuccessResponse<T>`. Controllers return plain
  payloads (or `{ data, meta }` when pagination metadata is needed) and
  never construct the envelope themselves.
- **Validation**: a global `ValidationPipe` (`whitelist`,
  `forbidNonWhitelisted`, `transform: true`) with a custom
  `exceptionFactory` that turns class-validator's errors into
  `ApiFieldError[]`, so field-level validation failures arrive at the
  client already structured (see `error.details` in the envelope).
- **Config**: `@nestjs/config` with a `class-validator`-based schema
  (`env.validation.ts`) that fails fast at boot on missing/malformed env
  vars instead of surfacing a confusing error later mid-request.
- **PrismaService**: a thin wrapper connecting/disconnecting via Nest's
  module lifecycle (`onModuleInit` / `onModuleDestroy`), registered as a
  `@Global()` module so it doesn't need to be re-imported everywhere.
  Tenant-scoping middleware/extensions are **not** implemented yet - that
  belongs in Phase 2 alongside the real domain models, so it can be
  designed against actual tables instead of a placeholder.

## 5. API versioning

URI versioning via Nest's built-in `VersioningType.URI`, combined with a
global prefix:

```ts
app.setGlobalPrefix('api');
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
```

Every route resolves to `/api/v1/...`. New major versions are added by
bumping `@Version('2')` on individual controllers/routes without
disturbing `v1` consumers (including the future mobile app).

## 6. Response envelope

Every API response - success or error - follows one shape, defined once in
`@cca/shared-types` and used identically by both apps:

```ts
// Success
{ success: true, data: T, meta?: { pagination?: {...}, requestId?: string } }

// Error
{
  success: false,
  error: {
    code: string,       // stable, machine-readable, e.g. "VALIDATION_FAILED"
    message: string,    // developer-facing, never localized
    statusCode: number,
    details?: { field, code, message }[],
    requestId?: string,
    timestamp: string,
    path?: string,
  }
}
```

**The backend never returns translated text.** It returns `code`; the
frontend maps `code` to a localized string via next-intl's `errors.<code>`
namespace (see `apps/web/src/messages/{en,ar}.json`). This keeps the
contract identical for every consumer regardless of UI language - the
same rule applies to the future mobile app and any MIS/SIS integration.

## 7. Error handling

Two independent code paths converge on the same envelope:

1. **Deliberate errors** - throw `AppException` (or a subclass like
   `NotFoundAppException`, `ForbiddenAppException`,
   `CrossTenantAccessException`) with a specific `ErrorCode`.
2. **Framework/unexpected errors** - anything else (Nest's built-in
   exceptions, validation failures, truly unexpected throws) is caught by
   `AllExceptionsFilter` and mapped via a status-code -> `ErrorCode`
   fallback table, or reported as `INTERNAL_SERVER_ERROR` with no leaked
   detail.

## 8. Logging

`nestjs-pino` replaces Nest's default logger for structured JSON logging
(`app.useLogger(app.get(Logger))` in `main.ts`, `bufferLogs: true` so
nothing is dropped before the logger is attached). Notable configuration:

- `genReqId`: reuses an inbound `x-request-id` header if present,
  otherwise generates a UUID. This ID is threaded through both the error
  envelope (`error.requestId`) and the success envelope (`meta.requestId`)
  so a client-reported issue can be traced to exact log lines.
- `redact`: strips `authorization` and `cookie` headers from logs.
- Pretty-printing (`pino-pretty`) is enabled only outside `production`;
  production emits raw JSON for log aggregation (CloudWatch, Loki, ELK,
  etc).

## 9. Internationalization (i18n)

`next-intl`, App Router integration, locale-prefixed routes
(`/en/...`, `/ar/...`, `localePrefix: 'always'`):

- `src/i18n/routing.ts` - defines the two locales and default locale.
- `src/middleware.ts` - locale detection/redirect via
  `createMiddleware(routing)`.
- `src/i18n/request.ts` - loads `src/messages/<locale>.json` per request.
- `src/i18n/navigation.ts` - locale-aware `Link`/`useRouter`/`usePathname`
  wrappers; always import navigation from here, not `next/navigation`.

English (`en.json`) is the source of truth; Arabic (`ar.json`) must stay
in sync key-for-key. Only a few namespaces exist so far (`app`, `common`,
`errors`) since there's no business UI text yet.

> **Known warning (non-blocking):** Next 16 has deprecated the
> `middleware.ts` file convention in favor of a `proxy.ts` convention.
> `next-intl`'s official App Router integration still documents
> `middleware.ts` as of this writing, so it was kept as-is rather than
> migrating ahead of upstream guidance. The build succeeds; this is a
> deprecation notice, not an error. Revisit once `next-intl` documents
> the `proxy` convention.

## 10. RTL/LTR strategy

Direction is resolved once from the active locale and set on `<html dir>`
in `app/[locale]/layout.tsx` (`getDirection(locale)` in `i18n/routing.ts`).
Components should use Tailwind's logical-property utilities (padding/
margin-inline-start/end, `text-start`/`text-end`) so they mirror
automatically between `en` and `ar`, rather than hard-coded
`pl-*`/`pr-*`/`text-left`/`text-right`. The `rtl:`/`ltr:` variants are
reserved for the rare case that genuinely needs a different value rather
than a mirrored one (e.g. rotating a directional icon).

## 11. Environment variables

**`apps/api/.env`** (see `apps/api/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `4000` | API listen port |
| `DATABASE_URL` | — (required) | Postgres connection string for Prisma |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed origin for the web app |
| `LOG_LEVEL` | `info` | pino log level |

**`apps/web/.env`** (see `apps/web/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api/v1` | Base URL the frontend calls |

**`docker/.env`** (see `docker/.env.example`): orchestration-level
variables (Postgres credentials, exposed ports, `CORS_ORIGIN`,
`NEXT_PUBLIC_API_URL`, `NGINX_PORT`) consumed by `docker-compose.yml`.

## 12. Docker setup

Three core services plus one optional profile, all on a single bridge
network (`cca-network`) so containers reach each other by service name:

| Service | Image/build | Notes |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Named volume `postgres_data`; healthcheck via `pg_isready` |
| `api` | `docker/api.Dockerfile` | Waits on `postgres` healthcheck; own healthcheck hits `/api/v1/health` |
| `web` | `docker/web.Dockerfile` | Depends on `api`; own healthcheck hits `/en` |
| `nginx` (profile `with-nginx`) | `nginx:1.27-alpine` | Off by default; enable with `--profile with-nginx` |

**No Redis, no Kubernetes, no message queue** - nothing in Phase 1's scope
needs them, and adding infrastructure ahead of a concrete requirement
would just be surface area to maintain for no current benefit.

Both Dockerfiles are multi-stage:

- **`api.Dockerfile`**: `deps` (install) → `build` (compile shared-types,
  `prisma generate`, compile api, `npm prune --omit=dev`) → `runtime`
  (alpine, non-root `nestjs` user, only compiled output + pruned
  `node_modules` + generated Prisma client copied in). Container
  healthcheck calls `/api/v1/health` with plain `http.get` (no extra
  curl/wget dependency needed in the image).
- **`web.Dockerfile`**: `deps` → `build` (compile shared-types, `next
  build` with `output: 'standalone'`) → `runtime` (alpine, non-root
  `nextjs` user, only `.next/standalone` + `.next/static` + `public`
  copied in, matching Next's traced monorepo output layout exactly:
  `apps/web/server.js` at the container's `/app/apps/web/server.js`).

Both build stages run `npm run build -w packages/shared-types` before
building their own app, since both apps depend on its compiled output at
build time.

## 13. Nginx

`docker/nginx/nginx.conf` is a working HTTP reverse proxy: `/api/*` →
`api:4000`, everything else → `web:3000`, with `X-Forwarded-*` headers set
and a `resolver` directive so it re-resolves Docker's embedded DNS instead
of caching a dead container IP. It is intentionally HTTP-only with **no
certificates or secrets** committed - see the comment block at the top of
the file for how to add TLS termination (either directly in this config
or at a layer in front of it) when deploying.

## 14. Code quality

- **Prettier**: a single root config (`.prettierrc.json`) applies to both
  apps and the shared package - the per-app `.prettierrc` that Nest's CLI
  scaffolded was removed so there's exactly one source of truth.
- **ESLint**: kept as **two separate configs**, not force-merged into one.
  `apps/api` uses Nest's scaffolded ESLint 8 legacy config; `apps/web`
  uses Next 16's ESLint 9 flat config (`eslint-config-next`). These are
  different major versions of ESLint with incompatible config formats -
  merging them would mean either downgrading Next's tooling or upgrading
  Nest's ahead of its own template, neither of which this phase's scope
  calls for. Practical unification here means: one Prettier source of
  truth, and both ESLint configs enforcing the same *intent*
  (TypeScript-aware rules + Prettier integration + no unused
  vars/imports), not one literal shared file.

## 15. Validation performed for Phase 1

Commands actually run against this repository (not just described):

```bash
npm install
npm run build:shared
npm run build:api
npm run build:web
npm run lint            # web + api
npm run format:check    # prettier, whole repo
npx tsc --noEmit -p apps/web/tsconfig.json
npx tsc --noEmit -p apps/api/tsconfig.json
npm run test            # api unit tests
npm run test:e2e        # api e2e test
npx prisma generate     # apps/api
npx prisma validate     # apps/api
npx prisma format       # apps/api
```

Docker Compose and the Dockerfiles were reviewed and structurally
validated (YAML parse + service/healthcheck/network assertions via a
Python script, and a manual cross-check of the Next.js standalone output
layout against the Dockerfile's `COPY`/`CMD` paths) because the Docker CLI
itself is not installed in this build sandbox - see below.

## 16. Known issues / environment limitations

Two limitations are specific to **this build sandbox** and are not code
defects:

1. **Prisma engine binaries unreachable.** `prisma generate`, `prisma
   validate`, and `prisma format` all fail identically:
   ```
   Error: Failed to fetch the engine file at
   https://binaries.prisma.sh/.../libquery_engine.so.node.gz - 403 Forbidden
   ```
   `binaries.prisma.sh` is not on this sandbox's network allowlist. The
   schema (`apps/api/prisma/schema.prisma`) was reviewed manually (valid
   generator/datasource blocks, balanced braces, valid Prisma DSL) since
   automated `prisma validate` couldn't run. This is a standard Prisma
   CLI requirement and will succeed on any developer machine or CI runner
   with normal internet access - nothing about the schema or project
   configuration is at fault.

   **Downstream effect:** the api's e2e test (`npm run test:e2e`) fails
   for exactly this reason - `PrismaService` extends `PrismaClient`, and
   the never-generated client throws `"@prisma/client did not initialize
   yet"` the moment Nest's DI container instantiates it. This was
   confirmed by reading the test failure's stack trace, which terminates
   inside the generated client stub, not in any of our own logic. The api
   **builds and lints cleanly**; only the runtime instantiation is
   blocked.

2. **Docker CLI not installed in this sandbox.** `docker compose config`
   could not be run directly. Compensating validation performed instead:
   YAML parsing plus structural assertions (all four services present,
   healthchecks present on `postgres`/`api`/`web`, `api` correctly
   `depends_on: postgres` with `condition: service_healthy`, `nginx`
   correctly gated behind the `with-nginx` profile), a brace-balance
   check on `nginx.conf`, and a manual diff of the real `next build
   --output=standalone` directory layout against both Dockerfiles' `COPY`
   sources and `CMD` paths (confirmed to match exactly:
   `.next/standalone/apps/web/server.js`).

Neither limitation blocks Phase 2 work, since Phase 2 doesn't depend on
Docker or a live Postgres connection to design the schema and write
migrations - it only means the person picking this up should run
`npm run prisma:generate` and `docker compose -f docker/docker-compose.yml
config` themselves once in an environment with normal network access, as
a final sanity check before deploying.

## 17. Deferred to later phases

Explicitly **not** implemented yet, by design:

- Authentication, sessions/tokens, RBAC enforcement
- The real domain model: Organization, School, Provider, Student,
  Activity, Enrollment, Session, Attendance, Performance, Report
- Tenant-scoping middleware/Prisma extensions
- Parent portal
- Booking, waiting lists
- Invoices, online payments (Amazon Payment Services / PayFort)
- Notifications
- Mobile app
- School MIS/SIS integrations

The architecture (shared response envelope, error codes, versioning,
i18n, Prisma plumbing, Docker/Nginx) is built so each of these can be
added without reworking the foundation.
