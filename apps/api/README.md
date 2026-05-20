# @trip-flow/api

ElysiaJS service that exposes TripFlow's HTTP API and the cron worker that
dispatches reminders.

## Scripts

| Command         | Purpose                                  |
| --------------- | ---------------------------------------- |
| `bun dev`       | Watch-mode dev server (port `PORT`/4000) |
| `bun run start` | Production-style start                   |
| `bun run build` | Bun bundle to `dist/`                    |
| `bun typecheck` | `tsc --noEmit`                           |
| `bun test`      | Bun test runner                          |

## Layout

```
src/
├── cron/        # @elysiajs/cron workers (master polling for reminders)
├── lib/         # Service-level singletons (Supabase admin client)
├── routes/      # HTTP endpoints (health, Google Maps proxy)
├── env.ts       # Fail-fast env loader — import `env` instead of process.env
└── index.ts     # Elysia entry point
```

## Adding a route

1. Create `src/routes/<name>.ts` exporting an `Elysia` instance with a
   `prefix`.
2. Validate input with `t.Object({ ... })` — never trust query/body.
3. Register it in `src/index.ts` via `.use(yourRoute)`.
