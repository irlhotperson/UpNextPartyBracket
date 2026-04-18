import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("player_session");

  if (!session) {
    return Response.json({ error: "No session" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get player
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("session_token", session.value)
    .single();

  if (playerError || !player) {
    return Response.json({ error: "Player not found" }, { status: 404 });
  }

  // Get event entries with event details
  const { data: entries } = await supabase
    .from("event_entries")
    .select("*, events(*)")
    .eq("player_id", player.id);

  // Get active matches for this player
  const { data: matches } = await supabase
    .from("matches")
    .select("*, events(*)")
    .or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`)
    .in("status", [
      "pending",
      "in_progress",
      "pending_confirmation",
      "disputed",
    ]);

  // Get player names for matches
  const playerIds = new Set<string>();
  matches?.forEach((m) => {
    if (m.player_a_id) playerIds.add(m.player_a_id);
    if (m.player_b_id) playerIds.add(m.player_b_id);
    if (m.reported_by_id) playerIds.add(m.reported_by_id);
  });
  playerIds.delete(player.id);

  let opponents: Record<string, { display_name: string; avatar_emoji: string }> = {};
  if (playerIds.size > 0) {
    const { data: opponentData } = await supabase
      .from("players")
      .select("id, display_name, avatar_emoji, avatar_photo_url")
      .in("id", Array.from(playerIds));
    if (opponentData) {
      opponents = Object.fromEntries(
        opponentData.map((p) => [
          p.id,
          { display_name: p.display_name, avatar_emoji: p.avatar_emoji, avatar_photo_url: p.avatar_photo_url },
        ])
      );
    }
  }

  // Get badges
  const { data: badges } = await supabase
    .from("badges")
    .select("*")
    .eq("player_id", player.id);

  return Response.json({
    player,
    entries: entries || [],
    matches: matches || [],
    opponents,
    badges: badges || [],
  });
}
