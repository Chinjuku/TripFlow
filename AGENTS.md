# AGENTS.md

Operating guide for human and AI contributors working in this repository.
If you are an automated agent (Claude Code, Cursor, Aider, Copilot, etc.),
treat the rules in this file as authoritative for the TripFlow monorepo.

---

## 1. Project at a glance

TripFlow is a collaborative trip planner. The product surface is a single
web app backed by one HTTP API and a shared Supabase Postgres database.

| Concern         | Choice                                   | Lives in              |
| --------------- | ---------------------------------------- | --------------------- |
| Monorepo        | Turborepo + Bun workspaces               | root                  |
| Frontend        | Vite + React 18 + TypeScript + Tailwind  | `apps/web`            |
| UI primitives   | shadcn/ui + Tailwind tokens              | `packages/ui`         |
| Drag & drop     | `react-dnd`                              | `apps/web`            |
| Cron picker UI  | `react-js-cron`                          | `apps/web`            |
| Maps            | Google Maps URL deep-links (no API key)  | `apps/web/src/lib/maps.ts` |
| Backend         | ElysiaJS on Bun                          | `apps/api`            |
| Cron worker     | `@elysiajs/cron` (master polling)        | `apps/api/src/cron`   |
| Database        | Supabase (Postgres + RLS + Realtime)     | `packages/db`         |
| Shared TS config| `@trip-flow/tsconfig`                    | `packages/tsconfig`   |

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

- Functional components only. Hooks at the top, no conditional hooks.
- Co-locate component-specific styles, tests, and stories next to the
  component (`Foo.tsx`, `Foo.test.tsx`).
- Reach for shared primitives in `@trip-flow/ui` before redefining a
  Button/Input/Dialog locally.
- Data fetching: prefer Supabase client subscriptions for realtime data;
  hit the Elysia API for anything that needs the service-role key.
- Maps: never call the Google Maps **API** from the browser. Build a
  Google Maps URL via `src/lib/maps.ts` and render it as an `<a>` — on
  mobile this opens the native Google Maps app automatically.

### Elysia (apps/api)

- One file per route group under `src/routes/`. Export an `Elysia`
  instance with a `prefix`.
- Validate every `query` / `body` / `params` with `t.Object({...})`. No
  unchecked input.
- Centralised error handling lives in `src/index.ts` via `.onError(...)`.
  Throw inside handlers; format there.
- Background work goes through `@elysiajs/cron` in `src/cron/`. Workers
  must be **idempotent** — assume your handler may fire twice.

### Database (Supabase)

- Schema changes ship as SQL migrations checked into `supabase/migrations/`
  (create the folder when the first migration lands).
- **RLS is on by default.** Every new table starts with `enable row level
  security` plus explicit policies for `select`, `insert`, `update`,
  `delete`.
- Regenerate types after every schema change:
  ```bash
  bunx supabase gen types typescript --project-id <id> \
    > packages/db/src/types.ts
  ```
- Google Maps payloads belong in a `jsonb` column on `trip_items.place`,
  not in a sprawl of denormalised columns.

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

| Layer            | Tooling                           | Lives in                    |
| ---------------- | --------------------------------- | --------------------------- |
| Unit (server)    | `bun test`                        | `apps/api/src/**/*.test.ts` |
| Unit (frontend)  | `vitest` + `@testing-library/react` (to add) | `apps/web/src/**/*.test.tsx` |
| E2E              | Playwright (to add)               | `apps/web/e2e/`             |

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
