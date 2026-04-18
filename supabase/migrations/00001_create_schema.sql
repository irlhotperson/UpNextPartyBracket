-- UpNext: Party Bracket — Database Schema
-- Run this migration against your Supabase project to set up all tables.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE party_status AS ENUM ('setup', 'active', 'completed');

CREATE TYPE event_format AS ENUM ('single_elim', 'boss_mode', 'hot_streak', 'best_score');

CREATE TYPE event_status AS ENUM ('setup', 'active', 'completed');

CREATE TYPE match_status AS ENUM (
  'pending',
  'in_progress',
  'pending_confirmation',
  'disputed',
  'completed'
);

CREATE TYPE badge_type AS ENUM ('boss_slayer', 'event_champion', 'party_mvp');

-- ============================================================
-- TABLES
-- ============================================================

-- Parties
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status party_status NOT NULL DEFAULT 'setup',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Players (global pool per party)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '🎮',
  session_token TEXT NOT NULL UNIQUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_party ON players(party_id);
CREATE INDEX idx_players_session ON players(session_token);

-- Events (multiple per party)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format event_format NOT NULL,
  format_config JSONB NOT NULL DEFAULT '{}',
  status event_status NOT NULL DEFAULT 'setup',
  station_label TEXT NOT NULL DEFAULT '',
  overall_winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_party ON events(party_id);

-- Event entries (which players are in which events)
CREATE TABLE event_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  eliminated BOOLEAN NOT NULL DEFAULT false,
  qualified BOOLEAN NOT NULL DEFAULT false,
  seed_order INTEGER,
  UNIQUE(event_id, player_id)
);

CREATE INDEX idx_entries_event ON event_entries(event_id);
CREATE INDEX idx_entries_player ON event_entries(player_id);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 1,
  bracket_position INTEGER NOT NULL DEFAULT 0,
  player_a_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player_b_id UUID REFERENCES players(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  status match_status NOT NULL DEFAULT 'pending',
  reported_by_id UUID REFERENCES players(id) ON DELETE SET NULL,
  reported_winner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  confirmed_by_id UUID REFERENCES players(id) ON DELETE SET NULL,
  admin_resolved BOOLEAN NOT NULL DEFAULT false,
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score_a INTEGER,
  score_b INTEGER
);

CREATE INDEX idx_matches_event ON matches(event_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_players ON matches(player_a_id, player_b_id);

-- Event photos
CREATE TABLE event_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_photos_event ON event_photos(event_id);

-- Badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  badge_type badge_type NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_badges_player ON badges(player_id);

-- ============================================================
-- REALTIME: Enable for tables that need live updates
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE event_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE badges;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
