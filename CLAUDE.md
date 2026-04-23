# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Remix CRUD App — Full CRUD task manager using Remix 2 resource routes with loader/action, in-memory data layer, and ErrorBoundary on every route.

Built with Remix, React 19, TypeScript 5.9, and Tailwind CSS.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server
npx tsc --noEmit         # Type check
npm run lint             # ESLint
```

## Architecture

- `app/routes/` — File-based routing with loaders and actions
- `app/components/` — Reusable React components
- `app/models/` — Data models and database access
- `app/utils/` — Shared utilities
- `public/` — Static assets

## Rules

- Use `loader` for GET data, `action` for mutations — no client-side fetching
- TypeScript strict mode — no `any` types
- Progressive enhancement — forms should work without JavaScript
- Tailwind utility classes for styling
