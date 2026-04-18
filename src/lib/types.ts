// UpNext: Party Bracket — TypeScript types matching Supabase schema

export type PartyStatus = "setup" | "active" | "completed";
export type EventFormat = "single_elim" | "boss_mode" | "hot_streak" | "best_score";
export type EventStatus = "setup" | "active" | "completed";
export type MatchStatus =
  | "pending"
  | "in_progress"
  | "pending_confirmation"
  | "disputed"
  | "completed";
export type BadgeType = "boss_slayer" | "event_champion" | "party_mvp";

export interface Party {
  id: string;
  name: string;
  status: PartyStatus;
  created_at: string;
}

export interface Player {
  id: string;
  party_id: string;
  display_name: string;
  avatar_emoji: string;
  avatar_photo_url: string | null;
  session_token: string;
  joined_at: string;
}

export interface Event {
  id: string;
  party_id: string;
  name: string;
  format: EventFormat;
  format_config: SingleElimConfig | BossModeConfig | HotStreakConfig | BestScoreConfig;
  status: EventStatus;
  station_label: string;
  overall_winner_id: string | null;
  created_at: string;
}

export interface SingleElimConfig {
  best_of: 1 | 3 | 5;
  allow_late_entry: boolean;
}

export interface BossModeConfig {
  boss_player_id: string;
  win_threshold_pct: number;
  boss_slayer_bonus: boolean;
}

export interface HotStreakConfig {
  round1_streak_target: number;
  max_qualifiers: number;
  round2_format: "single_elim" | "hot_streak_short";
  round2_streak_target: number;
}

export interface BestScoreConfig {
  attempts_per_player: number;
}

export interface EventEntry {
  id: string;
  event_id: string;
  player_id: string;
  eliminated: boolean;
  qualified: boolean;
  seed_order: number | null;
}

export interface Match {
  id: string;
  event_id: string;
  round: number;
  bracket_position: number;
  player_a_id: string | null;
  player_b_id: string | null;
  winner_id: string | null;
  status: MatchStatus;
  reported_by_id: string | null;
  reported_winner_id: string | null;
  confirmed_by_id: string | null;
  admin_resolved: boolean;
  called_at: string | null;
  completed_at: string | null;
  score_a: number | null;
  score_b: number | null;
}

export interface EventPhoto {
  id: string;
  event_id: string | null;
  storage_path: string;
  display_order: number;
}

export interface Badge {
  id: string;
  player_id: string;
  badge_type: BadgeType;
  event_id: string | null;
  awarded_at: string;
}
