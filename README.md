# Compass

A personal fitness command center — workouts, nutrition, sleep, supplements, steps, and cardio
in one place, with an AI coach on top. Source of truth for your fitness life, built on free tiers.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind v4**
- **shadcn/ui** + **Recharts** for UI and charts
- **tRPC** for typed API routes
- **Supabase** — Postgres, Auth (email + Google), Row Level Security, Storage
- **Gemini 2.5 Flash** for the AI coach (behind a swappable abstraction)
- **Resend** for weekly review emails
- **Vercel** for hosting + cron

## Architecture

Workout sources sit behind a `WorkoutProvider` interface. Only one adapter (`LyftaAdapter`)
talks to Lyfta; everything else — dashboard, PR detection, AI coach — reads canonical
`Workout` / `Exercise` / `Set` types. This lets Lyfta be swapped for native in-app tracking
later without rewriting the app.

## Build phases

1. **Foundation** — scaffold, auth, dashboard shell ✅ (current)
2. **Strength** — Lyfta sync via the provider abstraction
3. **Cardio** — Strava OAuth + activity sync (full GPS routes/maps)
4. **Steps** — Google Fit sync
5. Nutrition (Open Food Facts) · 6. Sleep/supplements/water · 7. AI coach ·
   8. Accountability · 9. Body comp + polish · 10. Native tracking · 11. Mobile

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project values
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy the project URL and anon key into `.env.local`.
3. In **Authentication → Providers**, enable Email and Google.
4. Add `http://localhost:3000/auth/callback` to the allowed redirect URLs.

## Project structure

```
src/
  app/
    (app)/            authenticated routes (sidebar shell) — /dashboard, future modules
    auth/             OAuth callback + sign-out action
    login/            email + Google sign-in
    api/trpc/         tRPC fetch handler
  components/         app shell + shadcn/ui primitives
  config/nav.ts       sidebar navigation (modules gated by `ready`)
  lib/supabase/       browser + server clients, session middleware
  lib/trpc/           tRPC React provider
  server/             tRPC init, context, routers
```

Total monthly cost at personal-use volume: **$0**.
