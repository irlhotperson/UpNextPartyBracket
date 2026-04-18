# UpNext: Party Bracket

Multi-event tournament party app. Guests scan a QR code, join the player pool, and compete across multiple stations running different formats in parallel. The app handles bracketing, multi-station orchestration, and special formats like Boss Mode and Hot Streak.

**Street Fighter II Turbo** aesthetic. Pixel fonts. Arcade colors. CRT scanline overlays. Dark mode only.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** — Postgres + Storage + Realtime (no Supabase Auth)
- **Tailwind CSS** + shadcn/ui (heavily restyled for arcade theme)
- **pnpm** package manager
- **Netlify** deploy target with `@netlify/plugin-nextjs`

## Full Setup Guide

### 1. Clone & Install

```bash
git clone https://github.com/irlhotperson/UpNextPartyBracket.git
cd UpNextPartyBracket
pnpm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning

### 3. Run Database Migrations

1. In your Supabase dashboard, go to **SQL Editor**
2. Open `supabase/migrations/00001_create_schema.sql` from this repo
3. Paste the entire file contents into the SQL Editor and click **Run**
4. This creates all tables, enums, indexes, and enables Realtime

### 4. (Optional) Seed Sample Data

1. In the SQL Editor, paste the contents of `supabase/seed.sql`
2. Click **Run** to insert 1 sample party, 3 events, and 8 players
3. Useful for development — skip in production

### 5. Create Storage Bucket

1. Go to **Storage** in the Supabase dashboard
2. Click **New bucket** and name it `event-photos`
3. Toggle **Public bucket** to ON
4. No RLS policies needed for v1

### 6. Get Your Keys

1. Go to **Settings > API** in Supabase
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

### 7. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=pick-a-strong-password
ADMIN_COOKIE_SECRET=at-least-32-chars-random-string
```

### 8. Run Dev Server

```bash
pnpm dev
```

Visit `http://localhost:3000` to see the splash screen.

### 9. Deploy to Netlify

1. Push this repo to GitHub (or fork it)
2. In Netlify, click **Add new site > Import from Git**
3. Connect to the repo
4. Set environment variables in **Site settings > Environment variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `ADMIN_COOKIE_SECRET`
5. Deploy — Netlify uses the `netlify.toml` config automatically

## Running a Party

### Admin Setup

1. Go to `/admin/login` and enter your admin password
2. Navigate to **Manage Parties** → create a new party
3. Add events to the party:
   - **Ping Pong** — Boss Mode (set boss player, 51% threshold)
   - **Beer Pong** — Hot Streak (streak target: 3, max 4 qualifiers)
   - **Golden Tee** — Single Elimination (bracket size auto-calculated)
4. Upload photos at **Photos** (multi-select from camera roll)
5. Display the QR code at **QR Code** on a screen for guests to scan

### Guest Join Flow

1. Guests scan the QR code on their phone
2. Enter their name, pick an emoji avatar (SF2 character-select style)
3. Choose which events to join (all pre-checked)
4. "PLAYER READY" flash → dropped into `/lobby`

### Running Events

1. Open the **Run Dashboard** (`/admin/party/[id]/run`)
2. Start each event when ready:
   - **Single Elim**: generates bracket with random seeding + byes
   - **Boss Mode**: generates gauntlet queue (boss vs each challenger)
   - **Hot Streak**: starts Round 1 qualifying queue
   - **Best Score**: activates score entry mode
3. Call matches → TV fires VS takeover → players see "YOU'RE UP" in lobby
4. Players report results → opponent confirms or disputes
5. Admin resolves disputes from the run dashboard

### TV Display

- Open `/display/party/[id]` on the 65" TV (full-screen Chrome)
- Shows all 3 events simultaneously with real-time updates
- Full-screen takeovers: VS screen, K.O., BOSS DEFEATED!, QUALIFIED!
- Boss Mode: W-L counter, Boss Slayers leaderboard
- Hot Streak: streak counter with heat effect, qualifiers board
- Best Score: live top-5 leaderboard

### Ending the Party

1. Admin clicks **End Party** or calls `POST /api/parties/[id]/wrap`
2. Awards Event Champion and Party MVP badges
3. TV fires the ceremony takeover:
   - Event Champions showcase
   - Boss Slayers roll call
   - Party MVP reveal with biggest fanfare

## Event Formats

### Single Elimination
Standard bracket tournament. Random seeding, automatic byes for non-power-of-2 counts. Late entries supported via `allow_late_entry` config.

### Boss Mode
One designated Boss plays every challenger once. If Boss wins >= threshold % of matches, Boss is champion. Otherwise, the top Boss Slayer wins. Every time someone beats the Boss, they get a Boss Slayer badge and the TV fires "BOSS DEFEATED!".

### Hot Streak
**Round 1 (Qualifying):** Two players start. Winner holds the throne. Challengers come up one at a time. First to hit the streak target qualifies for Round 2. Continues until max qualifiers reached.

**Round 2 (Finals):** Qualifiers play single-elimination bracket. Winner = Event Champion.

### Best Score
Each player gets N attempts at the station. Admin logs scores. Highest score wins. No bracket pressure.

## Security Notes

- The `SUPABASE_SERVICE_ROLE_KEY` is **server-only** — never sent to the client
- Admin auth uses HMAC-SHA256 signed httpOnly cookies
- All admin API routes verify the signed cookie
- Player result reporting is enforced: API checks `player_a_id` / `player_b_id` matches the session token
- Players cannot report/confirm results for matches they're not in
- To swap in real auth later, replace the `requireAdmin()` helper and admin cookie logic

## Project Structure

```
src/
  app/
    admin/           — Admin pages (login, parties, events, run dashboard, photos, QR)
    api/             — API routes (parties, events, players, matches, photos, badges)
    display/         — TV display pages (party dashboard, per-event view)
    join/            — Player join flow
    lobby/           — Player lobby with match status
  components/        — VS screen, KO screen, bracket view, ceremony screen
  lib/
    admin.ts         — Admin auth (cookie signing, password check, requireAdmin)
    bracket.ts       — Single-elim bracket generation
    match-utils.ts   — Match advancement + boss mode completion
    supabase/        — Supabase client helpers (browser + server)
    types.ts         — TypeScript types matching DB schema
supabase/
  migrations/        — SQL migration files
  seed.sql           — Sample data for development
```
