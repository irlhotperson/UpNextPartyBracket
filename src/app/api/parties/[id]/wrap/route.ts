import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

// End party and award MVP
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: partyId } = await params;
  const supabase = createServerClient();

  // Get MVP standings
  const { data: players } = await supabase
    .from("players")
    .select("id")
    .eq("party_id", partyId);

  const { data: events } = await supabase
    .from("events")
    .select("id, overall_winner_id")
    .eq("party_id", partyId);

  const { data: badges } = await supabase
    .from("badges")
    .select("*")
    .in(
      "player_id",
      players?.map((p) => p.id) || []
    );

  const eventIds = events?.map((e) => e.id) || [];
  const { data: matches } = await supabase
    .from("matches")
    .select("winner_id")
    .in("event_id", eventIds)
    .eq("status", "completed");

  // Calculate points
  const pointsMap = new Map<string, number>();
  players?.forEach((p) => pointsMap.set(p.id, 0));

  events?.forEach((e) => {
    if (e.overall_winner_id) {
      pointsMap.set(
        e.overall_winner_id,
        (pointsMap.get(e.overall_winner_id) || 0) + 5
      );
    }
  });

  badges?.forEach((b) => {
    if (b.badge_type === "boss_slayer") {
      pointsMap.set(b.player_id, (pointsMap.get(b.player_id) || 0) + 3);
    }
  });

  matches?.forEach((m) => {
    if (m.winner_id) {
      pointsMap.set(m.winner_id, (pointsMap.get(m.winner_id) || 0) + 1);
    }
  });

  // Find MVP (highest points)
  let mvpId = "";
  let maxPoints = 0;
  for (const [playerId, points] of pointsMap) {
    if (points > maxPoints) {
      mvpId = playerId;
      maxPoints = points;
    }
  }

  // Award event champion badges
  for (const event of events || []) {
    if (event.overall_winner_id) {
      const { data: existing } = await supabase
        .from("badges")
        .select("id")
        .eq("player_id", event.overall_winner_id)
        .eq("badge_type", "event_champion")
        .eq("event_id", event.id);

      if (!existing || existing.length === 0) {
        await supabase.from("badges").insert({
          player_id: event.overall_winner_id,
          badge_type: "event_champion",
          event_id: event.id,
        });
      }
    }
  }

  // Award MVP badge
  if (mvpId) {
    const { data: existing } = await supabase
      .from("badges")
      .select("id")
      .eq("player_id", mvpId)
      .eq("badge_type", "party_mvp");

    if (!existing || existing.length === 0) {
      await supabase.from("badges").insert({
        player_id: mvpId,
        badge_type: "party_mvp",
      });
    }
  }

  // Mark party as completed
  await supabase
    .from("parties")
    .update({ status: "completed" })
    .eq("id", partyId);

  return Response.json({
    mvp_id: mvpId,
    mvp_points: maxPoints,
    success: true,
  });
}
