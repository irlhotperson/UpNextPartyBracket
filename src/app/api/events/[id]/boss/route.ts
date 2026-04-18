import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

// Start boss mode: generate gauntlet matches
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event || event.format !== "boss_mode") {
    return Response.json({ error: "Not a boss_mode event" }, { status: 400 });
  }

  const config = event.format_config as {
    boss_player_id: string;
    win_threshold_pct: number;
    boss_slayer_bonus: boolean;
  };

  if (!config.boss_player_id) {
    return Response.json({ error: "Boss player not configured" }, { status: 400 });
  }

  // Get all entrants except the boss
  const { data: entries } = await supabase
    .from("event_entries")
    .select("player_id")
    .eq("event_id", eventId)
    .neq("player_id", config.boss_player_id);

  if (!entries || entries.length < 1) {
    return Response.json({ error: "Need at least 1 challenger" }, { status: 400 });
  }

  // Shuffle challengers
  const challengers = entries
    .map((e) => e.player_id)
    .sort(() => Math.random() - 0.5);

  // Delete existing matches
  await supabase.from("matches").delete().eq("event_id", eventId);

  // Create one match per challenger vs boss
  const matchInserts = challengers.map((challengerId, i) => ({
    event_id: eventId,
    round: 1,
    bracket_position: i,
    player_a_id: config.boss_player_id,
    player_b_id: challengerId,
    status: "pending" as const,
  }));

  const { data: matches, error } = await supabase
    .from("matches")
    .insert(matchInserts)
    .select();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Set event to active
  await supabase.from("events").update({ status: "active" }).eq("id", eventId);

  return Response.json({ matches }, { status: 201 });
}

// Get boss mode status
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event || event.format !== "boss_mode") {
    return Response.json({ error: "Not a boss_mode event" }, { status: 400 });
  }

  const config = event.format_config as {
    boss_player_id: string;
    win_threshold_pct: number;
    boss_slayer_bonus: boolean;
  };

  // Get all matches
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", eventId)
    .order("bracket_position");

  const completed = matches?.filter((m) => m.status === "completed") || [];
  const bossWins = completed.filter(
    (m) => m.winner_id === config.boss_player_id
  ).length;
  const bossLosses = completed.length - bossWins;
  const totalMatches = matches?.length || 0;
  const remaining = totalMatches - completed.length;

  // Calculate threshold
  const winsNeeded = Math.ceil(totalMatches * (config.win_threshold_pct / 100));
  const bossNeedsMore = Math.max(0, winsNeeded - bossWins);

  // Boss slayers: players who beat the boss
  const slayers = completed
    .filter((m) => m.winner_id !== config.boss_player_id && m.winner_id)
    .map((m) => m.winner_id!);

  // Get player info
  const playerIds = new Set<string>();
  playerIds.add(config.boss_player_id);
  matches?.forEach((m) => {
    if (m.player_a_id) playerIds.add(m.player_a_id);
    if (m.player_b_id) playerIds.add(m.player_b_id);
  });

  let players: Record<string, { display_name: string; avatar_emoji: string }> = {};
  if (playerIds.size > 0) {
    const { data: playerData } = await supabase
      .from("players")
      .select("id, display_name, avatar_emoji, avatar_photo_url")
      .in("id", Array.from(playerIds));
    if (playerData) {
      players = Object.fromEntries(
        playerData.map((p) => [
          p.id,
          { display_name: p.display_name, avatar_emoji: p.avatar_emoji, avatar_photo_url: p.avatar_photo_url },
        ])
      );
    }
  }

  return Response.json({
    event,
    config,
    matches: matches || [],
    players,
    stats: {
      bossWins,
      bossLosses,
      totalMatches,
      remaining,
      winsNeeded,
      bossNeedsMore,
      slayers,
      winPct:
        completed.length > 0
          ? Math.round((bossWins / completed.length) * 100)
          : 0,
    },
  });
}
