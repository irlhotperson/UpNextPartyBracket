# UpNext: Party Bracket

## Stack
- Next.js 15 (App Router) + TypeScript
- Supabase (Postgres + Storage + Realtime) — no Supabase Auth
- Tailwind CSS + shadcn/ui (arcade-restyled)
- pnpm, deploy to Netlify

## Conventions
- Dark mode only, SF2 Turbo aesthetic
- Fonts: "Press Start 2P" for headings, "VT323" for body
- All admin writes through API routes with `requireAdmin()` check
- Player actions verified by session_token matching
- Service role key never exposed to client
- No tests in v1
