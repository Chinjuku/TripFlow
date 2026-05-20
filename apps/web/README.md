# @trip-flow/web

Vite + React + Tailwind frontend for TripFlow.

## Scripts

| Command           | Purpose                       |
| ----------------- | ----------------------------- |
| `bun dev`         | Vite dev server on `:5173`    |
| `bun run build`   | Type-check then production build |
| `bun run preview` | Serve the built bundle        |
| `bun typecheck`   | `tsc --noEmit`                |

## Conventions

- Routes live in `src/pages/`, reusable widgets in `src/components/`.
- Use the shared `Button` (and future shadcn primitives) from
  `@trip-flow/ui/components/*` rather than redefining locally.
- Browser-side Supabase usage goes through `src/lib/supabase.ts` — never
  reach for the service-role key from the browser.
- PWA manifest is in `public/manifest.json`; icons in `public/icons/`.
