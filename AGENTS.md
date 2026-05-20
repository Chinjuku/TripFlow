# AGENTS.md

Operating guide for human and AI contributors working in this repository.
If you are an automated agent (Claude Code, Cursor, Aider, Copilot, etc.),
treat the rules in this file as authoritative for the TripFlow monorepo.

---

## 1. Project at a glance

TripFlow is a collaborative trip planner. The product surface is a single
web app backed by one HTTP API and a shared Supabase Postgres database.

| Concern          | Choice                                  | Lives in                   |
| ---------------- | --------------------------------------- | -------------------------- |
| Monorepo         | Turborepo + Bun workspaces              | root                       |
| Frontend         | Vite + React 18 + TypeScript + Tailwind | `apps/web`                 |
| UI primitives    | shadcn/ui + Tailwind tokens             | `packages/ui`              |
| Drag & drop      | `react-dnd`                             | `apps/web`                 |
| Cron picker UI   | `react-js-cron`                         | `apps/web`                 |
| Maps             | Google Maps URL deep-links (no API key) | `apps/web/src/lib/maps.ts` |
| Backend          | ElysiaJS on Bun                         | `apps/api`                 |
| Cron worker      | `@elysiajs/cron` (master polling)       | `apps/api/src/cron`        |
| Database         | Supabase (Postgres + RLS + Realtime)    | `packages/db`              |
| Shared TS config | `@trip-flow/tsconfig`                   | `packages/tsconfig`        |

### Workspace map

```
trip-flow/
├── apps/
│   ├── web/              # @trip-flow/web   — Vite + React PWA
│   └── api/              # @trip-flow/api   — Elysia + cron worker
└── packages/
    ├── db/               # @trip-flow/db        — Supabase types + clients
    ├── ui/               # @trip-flow/ui        — shared shadcn primitives
    └── tsconfig/         # @trip-flow/tsconfig  — shared tsconfigs
```

All internal packages are referenced via `workspace:*` and the
`@trip-flow/*` npm scope. Never import across apps with a relative path —
always go through a package.

---

## 2. Local development

### Prerequisites

- **Bun ≥ 1.3** (`curl -fsSL https://bun.sh/install | bash`)
- **Node ≥ 20** (for tooling that still expects Node; see `.nvmrc`)
- A Supabase project (URL, anon key, service-role key)

### First-time setup

```bash
bun install
cp .env.example .env
# fill in the Supabase values
```

### Day-to-day

```bash
bun dev          # runs all apps in parallel via Turbo
bun typecheck    # tsc --noEmit across every workspace
bun lint         # currently aliased to typecheck — wire in eslint/biome later
bun test         # runs all workspace tests
bun run build    # production build for every app/package
```

Run a single workspace with the `--filter` flag:

```bash
bun run --filter @trip-flow/web dev
bun run --filter @trip-flow/api dev
```

### Docker workflow

Compose runs both apps in development mode with bind-mounted source for
hot reload:

```bash
docker compose up
```

- Build context for **every** Dockerfile is the **monorepo root** — never
  the app folder. Workspace packages (`@trip-flow/db`, `@trip-flow/ui`,
  `@trip-flow/tsconfig`) must be in the build context.
- Dockerfiles are multi-stage: `base → deps → development → builder →
runtime`. Compose targets `development`; CI/prod targets `runtime`.
- `VITE_*` env vars are baked into the web bundle at build time, so they
  are passed via `--build-arg`, not via `-e` at run time. Anything that
  must change without a rebuild belongs on the API.
- The API image runs as the non-root `bun` user and ships only `dist/`
  plus `package.json` — no source, no `node_modules` from devDeps.
- Don't bake `.env` into images. Use `--env-file` or compose `env_file`.

---

## 3. Environment variables

`.env.example` is the source of truth. Two scopes:

- **Server-only** (`apps/api`): `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `PORT`. Loaded through
  [`apps/api/src/env.ts`](apps/api/src/env.ts) which throws on boot if
  anything is missing.
- **Browser-exposed** (`apps/web`): `VITE_*` only. Anything not prefixed
  `VITE_` is stripped by Vite at build time. **Never** put the
  service-role key behind a `VITE_*` prefix.

If you add a new variable:

1. Add it to `.env.example` with a placeholder.
2. Add it to `turbo.json` under the relevant task's `env` array so Turbo
   invalidates caches when it changes.
3. Add it to the typed loader (`apps/api/src/env.ts` or
   `apps/web/src/vite-env.d.ts`).

---

## 4. Coding standards

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`. Don't loosen these.
- No `any`. Prefer `unknown` at boundaries, then narrow.
- Use `import type` for type-only imports — `verbatimModuleSyntax` is on.
- Public functions in `packages/*` get explicit return types; app-level
  code can lean on inference.

### React (apps/web)

#### Directory Structure & Architecture

Under `apps/web/src/`, we enforce a strict separation of concerns:

- **`pages/`**: Page-level components corresponding directly to application routes. They handle page layouts, orchestrate feature blocks, and integrate with routing. They should contain minimal direct styling or local state, acting mainly as glue.
- **`components/`**: Generic, atomic, highly reusable UI components (e.g., custom loaders, layout wrappers, formatting primitives) that have **zero** domain or business knowledge. Reach for packages/ui primitives before creating anything here.
- **`features/`**: Domain-specific modules grouped by feature area (e.g., `features/trips`, `features/chat`, `features/collaboration`). Each feature directory contains its own components, custom hooks, and utility functions unique to that domain.
- **`hooks/`**: Global, reusable non-domain React hooks (e.g., `useMediaQuery`, `useDebounce`). Domain-specific hooks must live inside their respective `features/` directory.
- **`lib/`**: Configuration and initialization of libraries (e.g., Supabase client, query client, map utilities).
- **`stores/`**: Global state stores (Zustand) that cross multiple feature boundaries.

#### Calling Patterns & Dependency Rules

- **Strict One-Way Dependency:**
  ```
  pages ──> features ──> components
    │                       ▲
    └───────────────────────┘
  ```

  - `pages` may import from `features` and `components`.
  - `features` may import from `components` and other generic folders (`lib`, `stores`, `hooks`), but **never** from `pages`.
  - `components` (shared/atomic primitives) **CANNOT** import from `features` or `pages`. They must remain completely generic and reusable.
  - Cross-feature imports are discouraged. If `features/chat` needs logic from `features/trips`, abstract the shared logic into a common hook or global store, or limit dependencies to types.
- **Naming Conventions:**
  - React component files MUST use `PascalCase` (e.g., `TripCard.tsx`, `SidebarLayout.tsx`).
  - Utility files, styles, hooks, and configuration files MUST use `kebab-case` or `camelCase` (e.g., `use-media-query.ts`, `maps.ts`).
- **State Management Rules:**
  - **Local State:** Use standard React `useState` / `useReducer` for UI-only transient states.
  - **Global Client State:** Use Zustand for cross-component global state (e.g., user preferences, active planning modes). Minimize global state where possible.
  - **Server State / Cache:** Use React Query (or SWR) for caching, prefetching, and mutating data retrieved from the Elysia API. For direct realtime updates from Supabase, use Supabase client subscriptions managed within React Query effects or dedicated custom hooks inside `features/`.

#### Additional React Guidelines

- **Props Typing:** All components must explicitly type their props using TypeScript interfaces or types. No inline type casting.
- **Performance:** Avoid unnecessary heavy re-renders. Memoize expensive operations using `useMemo` and functions passed to children using `useCallback` where appropriate.
- **No Direct DOM Manipulation:** Always utilize React refs (`useRef`) and state. Do not bypass React with raw `document.querySelector` operations.
- **Maps:** Never call the Google Maps **API** from the browser. Build a Google Maps URL via `src/lib/maps.ts` and render it as an `<a>` — on mobile this opens the native Google Maps app automatically.

#### Routing (Generouted)

- **File-Based Routing:** We use `@generouted/react-router` for file-system based, type-safe routes. The route tree is automatically generated at build time from files under `apps/web/src/pages/`.
- **Pages Conventions:**
  - `src/pages/_app.tsx`: The root shell layout wrapping all routes. Put standard layouts (like `MainLayout`), React Query Providers, and globally required contexts here.
  - `src/pages/index.tsx`: Corresponds to the home route `/` (usually redirects to `/dashboard`).
  - `src/pages/dashboard.tsx`: Corresponds to `/dashboard`.
  - `src/pages/trips/[id].tsx`: Corresponds to dynamic path `/trips/:id`.
  - `src/pages/404.tsx`: Handles unmatched fallback paths automatically.
- **No Manual Routes:** Do not construct manual `<Routes>` components in `main.tsx` or `app.tsx`. Use Generouted's exported `<Routes />` component at the root entry point.

#### API Integration & E2E Type-Safety

- **Elysia Eden Treaty:** For server-side business actions, reminders, cron controls, or transactions requiring `service_role` credentials, the frontend uses Elysia's Eden client (`@elysiajs/eden`).
- **E2E Autocomplete:** Initialize the client in `apps/web/src/lib/api.ts` by importing `type App` from `@trip-flow/api`. This provides compile-time safety and autocompletion for all endpoints, payloads, and responses.
- **Direct Database Queries:** Call Supabase directly via `apps/web/src/lib/supabase.ts` ONLY for simple, non-sensitive CRUD operations that respect active Row-Level Security (RLS) policies.

### Elysia (apps/api)

#### Directory Structure: Route-Controller-Service-Model (RCSM)

To keep the backend structured, modular, and testable, all HTTP routes and business logic in `apps/api` must adhere to the RCSM pattern under `src/`:

- **`src/routes/`**: Declarative HTTP routing definitions.
  - _Responsibility_: Map HTTP methods and paths, apply route-specific middlewares (e.g., auth, parsing), and define/validate strict input schema shapes using Elysia's `t.Object()`.
  - _Constraints_: **Zero complex business logic.** Route handlers must strictly delegate to Controllers.
- **`src/controllers/`**: HTTP request-response adapters.
  - _Responsibility_: Extract parameters, query strings, and body payloads from Elysia's Context; perform basic input validation/sanitization; invoke the appropriate Services; format and return standard HTTP responses.
  - _Constraints_: Keep controllers slim. They must handle HTTP concerns (status codes, response serialization, cookies) but leave data calculations and queries to Services.
- **`src/services/`**: Core domain business logic.
  - _Responsibility_: Core business logic, data validation, calculations, transactions, and direct database queries/Supabase client operations.
  - _Constraints_: **HTTP-agnostic.** Services must not accept or know about Elysia's `Context` or request objects directly. They receive raw TypeScript primitive data or structured typed payloads, making them fully testable in isolation.
- **`src/models/`** (or **`src/schema/`**): Shared schemas, type definitions, and validator shapes.
  - _Responsibility_: Reusable schema validators (`t.Object`), TypeScript interface/type definitions, and shared constant values.

#### Calling Patterns & Error Handling

- **Request Flow Rules:**
  ```
  HTTP Request ──> Route ──> Controller ──> Service ──> Supabase/Database
  ```
  This chain must not be bypassed (e.g., Routes must never call Services directly; Controllers must never call the Database directly).
- **Error Handling & Propagation:**
  - Services must explicitly throw structured, semantic domain/business errors (e.g., `NotFoundError`, `UnauthorizedError`, `ConflictError`).
  - Do not catch database errors inside services unless translating them into readable domain errors.
  - Controllers or Elysia's global error handler (in `src/index.ts` via `.onError(...)`) will intercept these thrown errors, map them to standard HTTP status codes (e.g., 404 for `NotFoundError`, 409 for `ConflictError`), and return a uniform JSON error payload.
- **Service Idempotency & Transactions:**
  - Services that perform write operations must check if the operation has already been executed or can be safely retried.
  - Use database transaction blocks for multi-step database writes to ensure transactional integrity.

### Database (Supabase)

#### Naming Conventions

- All database elements—including table names, columns, schemas, foreign keys, indexes, triggers, and custom functions—MUST use `snake_case` (e.g., `trip_items`, `created_at`, `fk_trip_user`).
- Table names must be plural (e.g., `users`, `trips`, `trip_members`).

#### Row Level Security (RLS) & Authorization

- **RLS is mandatory and ON by default.** Every table migration MUST explicitly enable RLS:
  ```sql
  alter table table_name enable row level security;
  ```
- Define clear, fine-grained policies for `select`, `insert`, `update`, and `delete`.
- **Key Separation & Client Context:**
  - The Supabase `anon` key (used directly in `apps/web`) has restricted capabilities and respects all RLS policies. It relies on the JWT of the logged-in user (`auth.uid()`) to authorize data operations.
  - The Supabase `service_role` key (used strictly in `apps/api`) **bypasses all RLS policies**. Never expose this key in the frontend. All write/read operations that require administrative override or run background cron jobs must go through the API using the service role client.
- **Policy Pattern:**
  ```sql
  create policy "Users can view their own trip items"
  on trip_items for select
  using (
    exists (
      select 1 from trip_members
      where trip_members.trip_id = trip_items.trip_id
      and trip_members.user_id = auth.uid()
    )
  );
  ```

#### Migrations & Deployment Rules

- **Zero Manual Schema Edits:** Directly altering schemas, tables, columns, or triggers in the Supabase Dashboard UI is strictly prohibited in production and staging environments. All modifications must be written as declarative SQL scripts.
- **Local Migrations:** Every schema update must land as a new migration file via the local CLI:
  ```bash
  supabase migration new <describe_change>
  ```
  This generates a timestamped file under `supabase/migrations/`.

#### Database Functions, Triggers & Performance

- **Postgres Functions & Triggers:** Custom PostgreSQL functions, automated audit triggers, or timestamp updates must be fully declared within your migration scripts.
  - Always co-locate the trigger function and the trigger binding in the same migration file.
  - Example trigger pattern for `updated_at`:

    ```sql
    create or replace function update_modified_column()
    returns trigger as $$
    begin
        new.updated_at = now();
        return new;
    end;
    $$ language plpgsql;

    create trigger update_table_name_modtime
    before update on table_name
    for each row
    execute function update_modified_column();
    ```

- **Performance & Indexes:**
  - All foreign keys must have corresponding indexes created in the same migration file to prevent performance degradation on lookups.
  - JSONB payloads belong in a `jsonb` column on `trip_items.place`, not in a sprawl of denormalised columns. Do not denormalize core relational schemas into JSONB.
  - Always use `timestamptz` for date/time fields to preserve timezone information. Use UUIDs for primary keys.

#### Type Syncing & Generation

- Never edit `packages/db/src/types.ts` manually.
- After any schema migration, regenerate TypeScript types to keep the database client fully typed:
  ```bash
  bunx supabase gen types typescript --project-id <id> > packages/db/src/types.ts
  ```

### Formatting & lint

- Prettier config at the root (`.prettierrc.json`). Run `bun run format`
  before pushing.
- EditorConfig enforces LF, 2-space indents, final newline.

---

## 5. Git & PR workflow

- **Branches**: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`,
  `docs/<scope>`. Keep them short.
- **Commits**: Conventional Commits (`feat(api): …`, `fix(web): …`).
  One logical change per commit. Don't bundle unrelated cleanups.
- **PRs**:
  - Title mirrors the lead commit.
  - Body has **Summary**, **Test plan**, **Screenshots/Recordings**
    (for UI changes), **Migration notes** (if DB schema changed).
  - Required green checks: `typecheck`, `lint`, `test`, `build`.
- **Reviews**: at least one human approval before merge. AI agents may
  open PRs, but cannot self-approve their own changes.
- **Merging**: squash-merge to `main`. Delete the branch on merge.

---

## 6. Testing strategy

| Layer           | Tooling                                      | Lives in                     |
| --------------- | -------------------------------------------- | ---------------------------- |
| Unit (server)   | `bun test`                                   | `apps/api/src/**/*.test.ts`  |
| Unit (frontend) | `vitest` + `@testing-library/react` (to add) | `apps/web/src/**/*.test.tsx` |
| E2E             | Playwright (to add)                          | `apps/web/e2e/`              |

Rules of thumb:

- Don't mock Supabase in integration tests — hit a local Supabase
  instance (`supabase start`) so RLS policies actually run.
- Cron handlers must have a deterministic test that runs the polling
  query against fixture data and asserts side effects.
- Snapshot tests are fine for stable layout primitives, never for full
  pages.

---

## 7. Security & secrets

- The Supabase **service-role key** lives only in `apps/api`. Never put
  it in any `VITE_*` var, any frontend bundle, or any client-readable
  config.
- Maps integration uses Google Maps **URL deep-links** only — no API key
  is required or stored anywhere in the repo. If a future feature needs
  the Maps JavaScript API, route it through `apps/api` and document the
  new key in this file.
- New endpoints must declare an input schema. New tables must declare RLS
  policies in the same migration.
- Don't commit `.env`. `.gitignore` already excludes it; if you see one
  staged, stop and reset.
- Report suspected leaks privately to a maintainer before opening an
  issue or PR.

---

## 8. Performance & operations

- The cron worker polls every minute and processes up to 50 reminders
  per tick. If you need higher throughput, paginate by `last_run_at`
  rather than raising the limit — long ticks block the next one.
- Turbo cache lives in `.turbo/`. CI uses `--cache-dir=.turbo` and a
  remote cache (configure later).
- The web app is a PWA — assets are precached by Workbox. If you change
  the manifest or service-worker config, bump the build so clients
  refresh.

---

## 9. Working with AI agents

This repo welcomes AI-assisted contributions under these guardrails:

1. **Read this file first.** If a rule here conflicts with the user's
   instruction, ask before deviating.
2. **Make small, reviewable diffs.** One concern per PR. No drive-by
   refactors hidden inside a feature PR.
3. **Run the checks you would expect a human to run** (`bun typecheck`,
   `bun lint`, `bun test`) before declaring a task done.
4. **Never invent values for secrets, IDs, or schema fields.** Ask, or
   look them up. Placeholder commits in a real branch are not acceptable.
5. **Surface uncertainty.** It's better to flag a question in the PR
   description than to ship a confident wrong answer.
6. **Respect RLS and validation layers.** Don't bypass them "just for the
   test" — fix the policy or the schema instead.

---

## 10. Where to ask

- Architecture / scope questions → open a GitHub Discussion.
- Bugs → open an Issue with a minimal reproduction.
- Security concerns → email the maintainer listed in the repo metadata,
  do not open a public issue.
