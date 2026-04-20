import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playerId } = await params;
  const supabase = createServerClient();

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();

  if (!player) {
    return Response.json({ error: "Player not found" }, { status: 404 });
  }

  const { data: entries } = await supabase
    .from("event_entries")
    .select("*, events(*)")
    .eq("player_id", playerId);

  const { data: matches } = await supabase
    .from("matches")
    .select("*, events(*)")
    .or(`player_a_id.eq.${playerId},player_b_id.eq.${playerId}`)
    .in("status", ["pending", "in_progress", "pending_confirmation", "disputed"]);

  const playerIds = new Set<string>();
  matches?.forEach((m) => {
    if (m.player_a_id) playerIds.add(m.player_a_id);
    if (m.player_b_id) playerIds.add(m.player_b_id);
    if (m.reported_by_id) playerIds.add(m.reported_by_id);
  });
  playerIds.delete(playerId);

  let opponents: Record<string, { display_name: string; avatar_emoji: string; avatar_photo_url?: string | null }> = {};
  if (playerIds.size > 0) {
    const { data: opponentData } = await supabase
      .from("players")
      .select("id, display_name, avatar_emoji, avatar_photo_url")
      .in("id", Array.from(playerIds));
    if (opponentData) {
      opponents = Object.fromEntries(
        opponentData.map((p) => [p.id, { display_name: p.display_name, avatar_emoji: p.avatar_emoji, avatar_photo_url: p.avatar_photo_url }])
      );
    }
  }

  const { data: badges } = await supabase
    .from("badges")
    .select("*")
    .eq("player_id", playerId);

  return Response.json({
    player,
    entries: entries || [],
    matches: matches || [],
    opponents,
    badges: badges || [],
  });
}
