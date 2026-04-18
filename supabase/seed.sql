-- UpNext: Party Bracket — Seed Data
-- Sample party with 3 events and 8 players for development.

-- Party
INSERT INTO parties (id, name, status) VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'House Party #1', 'setup');

-- Players (8 sample players)
INSERT INTO players (id, party_id, display_name, avatar_emoji, session_token) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Remi', '👑', 'seed-token-remi'),
  ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Alex', '🔥', 'seed-token-alex'),
  ('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Jordan', '⚡', 'seed-token-jordan'),
  ('44444444-4444-4444-4444-444444444444', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Casey', '🎯', 'seed-token-casey'),
  ('55555555-5555-5555-5555-555555555555', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Morgan', '🎸', 'seed-token-morgan'),
  ('66666666-6666-6666-6666-666666666666', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Riley', '🏆', 'seed-token-riley'),
  ('77777777-7777-7777-7777-777777777777', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Sam', '🎮', 'seed-token-sam'),
  ('88888888-8888-8888-8888-888888888888', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Taylor', '💥', 'seed-token-taylor');

-- Event 1: Ping Pong — Boss Mode (Remi as Boss)
INSERT INTO events (id, party_id, name, format, format_config, status, station_label) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
   'Ping Pong', 'boss_mode',
   '{"boss_player_id": "11111111-1111-1111-1111-111111111111", "win_threshold_pct": 51, "boss_slayer_bonus": true}',
   'setup', 'Ping Pong Table');

-- Event 2: Beer Pong — Hot Streak
INSERT INTO events (id, party_id, name, format, format_config, status, station_label) VALUES
  ('bbbb2222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
   'Beer Pong', 'hot_streak',
   '{"round1_streak_target": 3, "max_qualifiers": 4, "round2_format": "single_elim", "round2_streak_target": 2}',
   'setup', 'Beer Pong Table');

-- Event 3: Golden Tee — Single Elimination
INSERT INTO events (id, party_id, name, format, format_config, status, station_label) VALUES
  ('cccc3333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
   'Golden Tee', 'single_elim',
   '{"bracket_size": 8, "best_of": 1, "allow_late_entry": true}',
   'setup', 'Golden Tee Cabinet');

-- Event entries: all 8 players in all 3 events
INSERT INTO event_entries (event_id, player_id) VALUES
  -- Ping Pong (Boss Mode)
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('aaaa1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('aaaa1111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333'),
  ('aaaa1111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444'),
  ('aaaa1111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555'),
  ('aaaa1111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666'),
  ('aaaa1111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777'),
  ('aaaa1111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888'),
  -- Beer Pong (Hot Streak)
  ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222'),
  ('bbbb2222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333'),
  ('bbbb2222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444'),
  ('bbbb2222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555'),
  ('bbbb2222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666'),
  ('bbbb2222-2222-2222-2222-222222222222', '77777777-7777-7777-7777-777777777777'),
  ('bbbb2222-2222-2222-2222-222222222222', '88888888-8888-8888-8888-888888888888'),
  ('bbbb2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  -- Golden Tee (Single Elim)
  ('cccc3333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222'),
  ('cccc3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),
  ('cccc3333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444'),
  ('cccc3333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555'),
  ('cccc3333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666'),
  ('cccc3333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777777'),
  ('cccc3333-3333-3333-3333-333333333333', '88888888-8888-8888-8888-888888888888'),
  ('cccc3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');
