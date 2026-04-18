import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get("player_session");
  if (!session) {
    return Response.json({ error: "No session" }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("session_token", session.value)
    .single();

  if (!player) {
    return Response.json({ error: "Player not found" }, { status: 404 });
  }

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  if (match.player_a_id !== player.id && match.player_b_id !== player.id) {
    return Response.json(
      { error: "You are not a participant in this match" },
      { status: 403 }
    );
  }

  if (match.status !== "pending") {
    // Match already started — return it as-is
    return Response.json(match);
  }

  if (!match.player_a_id || !match.player_b_id) {
    return Response.json(
      { error: "Opponent not yet assigned" },
      { status: 400 }
    );
  }

  // Determine which slot this player fills
  const isPlayerA = player.id === match.player_a_id;
  const myField = isPlayerA ? "ready_a_id" : "ready_b_id";
  const theirField = isPlayerA ? "ready_b_id" : "ready_a_id";
  const theirReady = match[theirField];

  // Build update
  const update: Record<string, unknown> = { [myField]: player.id };

  // If both ready, start the match
  if (theirReady) {
    update.status = "in_progress";
    update.called_at = new Date().toISOString();
  }

  // Atomic update — only if still pending (prevents race with admin call)
  const { data: updated, error } = await supabase
    .from("matches")
    .update(update)
    .eq("id", matchId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    // Match was likely called by admin between fetch and update — refetch
    const { data: refetched } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();
    return Response.json(refetched);
  }

  return Response.json(updated);
}
