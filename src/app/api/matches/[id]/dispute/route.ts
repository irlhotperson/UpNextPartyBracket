import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params;

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

  // Get match
  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (!match) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  // Verify player is a participant
  if (match.player_a_id !== player.id && match.player_b_id !== player.id) {
    return Response.json(
      { error: "You are not a participant in this match" },
      { status: 403 }
    );
  }

  if (match.status !== "pending_confirmation") {
    return Response.json(
      { error: "Match is not pending confirmation" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("matches")
    .update({ status: "disputed" })
    .eq("id", matchId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
