import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;
  const body = await request.json();
  const { winner_id } = body;

  if (!winner_id) {
    return Response.json({ error: "winner_id required" }, { status: 400 });
  }

  // Get player session
  const cookieStore = await cookies();
  const session = cookieStore.get("player_session");
  if (!session) {
    return Response.json({ error: "No session" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Get player
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("session_token", session.value)
    .single();

  if (!player) {
    return Response.json({ error: "Player not found" }, { status: 404 });
  }

  // Get match and verify player is a participant
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

  if (match.status !== "in_progress") {
    return Response.json(
      { error: "Match is not in progress" },
      { status: 400 }
    );
  }

  // Verify winner is one of the participants
  if (winner_id !== match.player_a_id && winner_id !== match.player_b_id) {
    return Response.json({ error: "Invalid winner" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("matches")
    .update({
      status: "pending_confirmation",
      reported_by_id: player.id,
      reported_winner_id: winner_id,
    })
    .eq("id", matchId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
