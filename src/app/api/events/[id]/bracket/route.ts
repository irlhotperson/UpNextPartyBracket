import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";
import { generateSingleElimBracket } from "@/lib/bracket";

// Generate bracket for a single-elim event
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const supabase = createServerClient();

  // Get event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventError || !event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  if (event.format !== "single_elim") {
    return Response.json(
      { error: "Bracket generation only for single_elim events" },
      { status: 400 }
    );
  }

  // Get entries
  const { data: entries } = await supabase
    .from("event_entries")
    .select("player_id")
    .eq("event_id", eventId)
    .eq("eliminated", false);

  if (!entries || entries.length < 2) {
    return Response.json(
      { error: "Need at least 2 players" },
      { status: 400 }
    );
  }

  const playerIds = entries.map((e) => e.player_id);
  const bracketMatches = generateSingleElimBracket(playerIds);

  // Delete existing matches for this event
  await supabase.from("matches").delete().eq("event_id", eventId);

  // Insert bracket matches
  const matchInserts = bracketMatches.map((m) => ({
    event_id: eventId,
    round: m.round,
    bracket_position: m.bracket_position,
    player_a_id: m.player_a_id,
    player_b_id: m.player_b_id,
    status: m.is_bye ? ("completed" as const) : ("pending" as const),
    winner_id: m.is_bye ? m.player_a_id : null,
    completed_at: m.is_bye ? new Date().toISOString() : null,
    admin_resolved: m.is_bye,
  }));

  const { data: insertedMatches, error: insertError } = await supabase
    .from("matches")
    .insert(matchInserts)
    .select();

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  // Process bye winners — advance them to next round
  const byeMatches = insertedMatches?.filter(
    (m) => m.status === "completed" && m.winner_id
  );
  if (byeMatches && byeMatches.length > 0) {
    for (const byeMatch of byeMatches) {
      const nextRound = byeMatch.round + 1;
      const nextPos = Math.floor(byeMatch.bracket_position / 2);
      const slot = byeMatch.bracket_position % 2 === 0 ? "player_a_id" : "player_b_id";

      await supabase
        .from("matches")
        .update({ [slot]: byeMatch.winner_id })
        .eq("event_id", eventId)
        .eq("round", nextRound)
        .eq("bracket_position", nextPos);
    }
  }

  // Set event to active
  await supabase
    .from("events")
    .update({ status: "active" })
    .eq("id", eventId);

  return Response.json({ matches: insertedMatches }, { status: 201 });
}

// Get bracket matches for an event
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = createServerClient();

  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", eventId)
    .order("round")
    .order("bracket_position");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Get all player info for the bracket
  const playerIds = new Set<string>();
  matches?.forEach((m) => {
    if (m.player_a_id) playerIds.add(m.player_a_id);
    if (m.player_b_id) playerIds.add(m.player_b_id);
    if (m.winner_id) playerIds.add(m.winner_id);
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

  return Response.json({ matches: matches || [], players });
}
