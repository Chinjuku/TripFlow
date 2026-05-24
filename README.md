# TripFlow

> Collaborative trip planner with drag-and-drop boards, Google Maps
> navigation deep-links, and cron-scheduled reminders.

TripFlow is a Turborepo + Bun monorepo. The web client is a Vite-built
React PWA; the API is an ElysiaJS service on Bun that also runs the cron
worker for reminder dispatch. Supabase (Postgres + RLS + Realtime) is the
single source of truth.

---

## Tech stack

| Layer       | Tech                                                                |
| ----------- | ------------------------------------------------------------------- |
| Monorepo    | [Turborepo](https://turbo.build) + [Bun](https://bun.sh) workspaces |
| Frontend    | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui                 |
| Interaction | `react-dnd` (drag-and-drop boards), `react-js-cron` (reminder UI)   |
| Backend     | ElysiaJS on Bun, `@elysiajs/cron` (master-polling worker)           |
| Database    | Supabase — Postgres, Row Level Security, Realtime, `jsonb`          |
| PWA         | `vite-plugin-pwa` (Workbox) + `public/manifest.json`                |

---

## Repository layout

```
trip-flow/
├── apps/
│   ├── web/                # @trip-flow/web  — Vite + React + Tailwind
│   │   └── src/
│   │       ├── components/ # Card, Board, CronPicker, …
│   │       ├── lib/        # Browser Supabase client, API client
│   │       └── pages/      # Dashboard, Trip Board
│   └── api/                # @trip-flow/api  — ElysiaJS + cron
│       └── src/
│           ├── cron/       # Reminder polling worker
│           ├── routes/     # HTTP endpoints (health, …)
│           └── index.ts    # Elysia entry point
├── packages/
│   ├── db/                 # @trip-flow/db        — Supabase types + clients
│   ├── ui/                 # @trip-flow/ui        — shared shadcn primitives
│   └── tsconfig/           # @trip-flow/tsconfig  — shared TS configs
├── turbo.json
├── package.json
└── AGENTS.md               # Contributor & AI-agent operating guide
```

---

## Getting started

### Prerequisites

- **Bun ≥ 1.3** — `curl -fsSL https://bun.sh/install | bash`
- **Node ≥ 20** — see `.nvmrc`
- A Supabase project (URL + anon key + service-role key)

- **Bun ≥ 1.3** 
  Mac&OS
  — `curl -fsSL https://bun.sh/install | bash`
  Windows
  — `powershell -c "irm bun.sh/install.ps1|iex"`
- **Node ≥ 20** — see `.nvmrc`
- A Supabase project (URL + anon key + service-role key)

### Install & configure
Mac&OS
```bash
bun install
cp .env.example .env
# edit .env with your Supabase values
```
Windows
```bash
bun install
copy .env.example .env
# edit .env with your Supabase values

### Run everything

```bash
bun dev
```

Turbo will start `@trip-flow/web` on <http://localhost:5173> and
`@trip-flow/api` on <http://localhost:4000> in parallel.

### Run a single workspace

```bash
bun run --filter @trip-flow/web dev
bun run --filter @trip-flow/api dev
```

### Run inside Docker

For a zero-toolchain setup (no host Bun, no host Node):

```bash
docker compose up           # api + web with hot reload
docker compose up api       # just one service
docker compose down         # stop everything
```

The compose file bind-mounts `apps/` and `packages/` into the containers
so edits hot-reload. `.env` at the repo root is read automatically.

Production images (multi-stage, minimal runtime):

```bash
# API: Bun runtime serving a built bundle.
docker build -f apps/api/Dockerfile --target runtime -t trip-flow-api .

# Web: nginx serving the static Vite bundle. VITE_* must be passed at
# build time because Vite bakes them into the bundle.
docker build -f apps/web/Dockerfile --target runtime \
  --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
  --build-arg VITE_API_URL=$VITE_API_URL \
  -t trip-flow-web .
```

---

## Scripts

Root scripts fan out across the monorepo via Turbo:

| Script                 | What it does                                |
| ---------------------- | ------------------------------------------- |
| `bun dev`              | Start every app in dev mode                 |
| `bun run build`        | Production build of every app/package       |
| `bun typecheck`        | `tsc --noEmit` everywhere                   |
| `bun lint`             | Lint pipeline (currently typecheck)         |
| `bun test`             | Test suites across every workspace          |
| `bun run format`       | Prettier write                              |
| `bun run format:check` | Prettier check (use in CI)                  |
| `bun run clean`        | Drop `dist/`, `.turbo/`, and `node_modules` |

---

## Environment variables

The full list lives in [`.env.example`](.env.example). Two scopes:

- **Server-only** (`apps/api`): `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `PORT`.
- **Browser-exposed** (`apps/web`): anything prefixed `VITE_`
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`).

> **Never** expose the service-role key behind a `VITE_*` prefix — Vite
> will ship it in the browser bundle.

When you add a new var, update `.env.example`, the typed loader
(`apps/api/src/env.ts` or `apps/web/src/vite-env.d.ts`), and the
`env` array in `turbo.json` so cache keys stay correct.

---

## Database

Supabase types are committed to
[`packages/db/src/types.ts`](packages/db/src/types.ts). Regenerate after
every schema change:

```bash
bunx supabase gen types typescript --project-id <project-id> \
  > packages/db/src/types.ts
```

Every new table ships with **RLS on** plus explicit `select / insert /
update / delete` policies in the same migration.

---

## Contributing

See [AGENTS.md](./AGENTS.md) for the full contributor and AI-agent
operating guide (branch naming, commit style, PR checklist, testing
strategy, security rules).

---

## License

TBD.
