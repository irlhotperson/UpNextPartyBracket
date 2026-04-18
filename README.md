# UpNext: Party Bracket

Multi-event tournament party app. Guests scan a QR code, join the player pool, and compete across multiple stations running different formats in parallel.

**Street Fighter II Turbo** aesthetic. Pixel fonts. Arcade colors. Scanline overlays.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **Supabase** (Postgres + Storage + Realtime)
- **Tailwind CSS** + shadcn/ui (heavily restyled)
- **pnpm** package manager
- **Netlify** deploy target

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/irlhotperson/UpNextPartyBracket.git
cd UpNextPartyBracket
pnpm install
```

### 2. Supabase Project

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the **SQL Editor** in your Supabase dashboard
3. Run `supabase/migrations/00001_create_schema.sql` to create all tables and enums
4. Optionally run `supabase/seed.sql` to insert sample data (1 party, 3 events, 8 players)
5. Go to **Storage** and create a public bucket called `event-photos`
6. In bucket settings, set the bucket to **Public** (no RLS policies needed for v1)
7. Copy your project URL, anon key, and service role key from **Settings > API**

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials and admin password.

### 4. Run Dev Server

```bash
pnpm dev
```

### 5. Deploy to Netlify

1. Connect this repo to Netlify
2. Set environment variables in the Netlify dashboard
3. Netlify will auto-build using the `netlify.toml` config

## Event Formats

- **Single Elimination** — standard bracket tournament
- **Boss Mode** — one player (the Boss) takes on all challengers
- **Hot Streak** — qualify by winning consecutive matches, then finals bracket
- **Best Score** — highest score wins, no bracket needed

## Project Structure

```
src/
  app/          — Next.js App Router pages and API routes
  components/   — React components (ui/ for shadcn)
  lib/          — Utilities (Supabase clients, helpers)
supabase/
  migrations/   — SQL migration files
  seed.sql      — Sample data for development
```
