import { createServerClient } from "@/lib/supabase/server";

// MVP point values
const POINTS = {
  event_champion: 5,
  boss_slayer: 3,
  bracket_win: 1,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: partyId } = await params;
  const supabase = createServerClient();

  // Get all players in the party
  const { data: players } = await supabase
    .from("players")
    .select("id, display_name, avatar_emoji, avatar_photo_url")
    .eq("party_id", partyId);

  if (!players) return Response.json({ standings: [] });

  // Get all events for MVP context
  const { data: events } = await supabase
    .from("events")
    .select("id, name, overall_winner_id")
    .eq("party_id", partyId);

  // Get all badges
  const { data: badges } = await supabase
    .from("badges")
    .select("*")
    .in(
      "player_id",
      players.map((p) => p.id)
    );

  // Get all completed matches for bracket wins
  const eventIds = events?.map((e) => e.id) || [];
  const { data: matches } = await supabase
    .from("matches")
    .select("winner_id, event_id")
    .in("event_id", eventIds)
    .eq("status", "completed");

  // Calculate points
  const pointsMap = new Map<string, number>();
  players.forEach((p) => pointsMap.set(p.id, 0));

  // Event champion points
  events?.forEach((event) => {
    if (event.overall_winner_id) {
      const current = pointsMap.get(event.overall_winner_id) || 0;
      pointsMap.set(event.overall_winner_id, current + POINTS.event_champion);
    }
  });

  // Boss slayer points
  badges?.forEach((badge) => {
    if (badge.badge_type === "boss_slayer") {
      const current = pointsMap.get(badge.player_id) || 0;
      pointsMap.set(badge.player_id, current + POINTS.boss_slayer);
    }
  });

  // Bracket win points (match wins)
  matches?.forEach((match) => {
    if (match.winner_id) {
      const current = pointsMap.get(match.winner_id) || 0;
      pointsMap.set(match.winner_id, current + POINTS.bracket_win);
    }
  });

  // Build standings
  const standings = players
    .map((player) => ({
      player,
      points: pointsMap.get(player.id) || 0,
      badges: badges?.filter((b) => b.player_id === player.id) || [],
      championOf: events
        ?.filter((e) => e.overall_winner_id === player.id)
        .map((e) => e.name) || [],
    }))
    .sort((a, b) => b.points - a.points);

  return Response.json({
    standings,
    pointValues: POINTS,
  });
}
