# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Remix CRUD App — Full-stack task manager using Remix 2 loaders/actions with Supabase (PostgreSQL) as the data layer and Supabase Auth for authentication. Features full tasks CRUD, comments, profiles, filtering, sorting, and ErrorBoundary on every route.

Built with Remix 2.15, React 19, TypeScript 5.9, Tailwind CSS, and Supabase.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npm run test             # Run unit tests (vitest)
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run E2E tests (Playwright)
npm run lint             # ESLint
npm run format           # Prettier
npm run typecheck        # TypeScript type check (tsc --noEmit)
```

## Environment Variables

Copy `.env.example` to `.env` and set:

```
SUPABASE_URL=           # Supabase project URL
SUPABASE_ANON_KEY=      # Supabase anon public key
SUPABASE_SERVICE_ROLE_KEY=  # Supabase service role key (server-only)
```

Run `npx supabase start` for a local Supabase stack, then apply migrations:

```bash
npx supabase db push
npx supabase db seed
```

## Architecture

- `app/routes/` — File-based routing with loaders and actions
  - `_index.tsx` — Tasks list: create, filter, sort, inline status update, delete
  - `tasks.$id.tsx` — Task detail: edit all fields, comments
  - `auth.login.tsx` / `auth.signup.tsx` / `auth.logout.tsx` — Auth routes
- `app/lib/` — Server-side data access (all files end in `.server.ts`)
  - `supabase.server.ts` — Supabase client factory (`createSupabaseServerClient`), `requireUser`
  - `tasks.server.ts` — Task CRUD + comment CRUD using Supabase
  - `profiles.server.ts` — Profile read/upsert using Supabase
  - `database.types.ts` — Auto-generated Supabase TypeScript types
- `app/types/index.ts` — Shared TypeScript types: `Task`, `TaskStatus`, `TaskPriority`, `Profile`, `TaskComment`, `TaskFilters`
- `app/components/` — Reusable React components (currently empty; inline components in routes)
- `supabase/` — Local Supabase config, migrations, and seed data
- `tests/unit/` — Vitest unit tests
- `tests/e2e/` — Playwright E2E tests

## Rules

- Use `loader` for GET data, `action` for mutations — no client-side fetching
- TypeScript strict mode — no `any` types
- Progressive enhancement — forms should work without JavaScript
- Tailwind utility classes for styling — no custom CSS files
- All database access goes through `app/lib/*.server.ts` — never import Supabase directly in routes
- Use `requireUser(request)` to protect authenticated routes; it throws a redirect to `/auth/login` if unauthenticated
- Response envelopes: `json({ key: [...] })` from loaders — always destructure with `useLoaderData<typeof loader>()`
- Unit test mocks: `vi.mock("../../../app/lib/supabase.server", ...)` — mock at the `supabase.server` boundary
