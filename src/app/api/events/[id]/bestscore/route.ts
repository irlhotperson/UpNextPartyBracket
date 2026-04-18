import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

// Start Best Score mode
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body.action || "start";
  const supabase = createServerClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event || event.format !== "best_score") {
    return Response.json({ error: "Not a best_score event" }, { status: 400 });
  }

  if (action === "start") {
    await supabase
      .from("events")
      .update({ status: "active" })
      .eq("id", eventId);

    return Response.json({ success: true });
  }

  if (action === "record_score") {
    // Admin records a score for a player
    const { player_id, score } = body;
    if (!player_id || score === undefined) {
      return Response.json(
        { error: "player_id and score required" },
        { status: 400 }
      );
    }

    // Create a "match" entry to store the score attempt
    // Using score_a for the player's score, bracket_position as attempt number
    const { data: existingAttempts } = await supabase
      .from("matches")
      .select("bracket_position")
      .eq("event_id", eventId)
      .eq("player_a_id", player_id)
      .order("bracket_position", { ascending: false })
      .limit(1);

    const attemptNumber =
      existingAttempts && existingAttempts.length > 0
        ? existingAttempts[0].bracket_position + 1
        : 1;

    const config = event.format_config as { attempts_per_player: number };
    if (attemptNumber > config.attempts_per_player) {
      return Response.json(
        { error: "Player has used all attempts" },
        { status: 400 }
      );
    }

    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        event_id: eventId,
        round: 1,
        bracket_position: attemptNumber,
        player_a_id: player_id,
        player_b_id: null,
        score_a: score,
        status: "completed",
        winner_id: player_id,
        admin_resolved: true,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(match);
  }

  if (action === "finish") {
    // Determine winner — highest score
    const { data: matches } = await supabase
      .from("matches")
      .select("player_a_id, score_a")
      .eq("event_id", eventId)
      .eq("status", "completed")
      .order("score_a", { ascending: false })
      .limit(1);

    if (matches && matches.length > 0 && matches[0].player_a_id) {
      await supabase
        .from("events")
        .update({
          overall_winner_id: matches[0].player_a_id,
          status: "completed",
        })
        .eq("id", eventId);

      return Response.json({
        winner_id: matches[0].player_a_id,
        top_score: matches[0].score_a,
      });
    }

    return Response.json({ error: "No scores recorded" }, { status: 400 });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

// Get Best Score leaderboard
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

  if (!event || event.format !== "best_score") {
    return Response.json({ error: "Not a best_score event" }, { status: 400 });
  }

  // Get all score entries
  const { data: matches } = await supabase
    .from("matches")
    .select("player_a_id, score_a, bracket_position")
    .eq("event_id", eventId)
    .eq("status", "completed")
    .order("score_a", { ascending: false });

  // Build leaderboard: best score per player
  const bestScores = new Map<string, number>();
  matches?.forEach((m) => {
    if (m.player_a_id && m.score_a !== null) {
      const current = bestScores.get(m.player_a_id);
      if (current === undefined || m.score_a > current) {
        bestScores.set(m.player_a_id, m.score_a);
      }
    }
  });

  const leaderboard = Array.from(bestScores.entries())
    .map(([player_id, best_score]) => ({ player_id, best_score }))
    .sort((a, b) => b.best_score - a.best_score);

  // Get player info
  const playerIds = leaderboard.map((l) => l.player_id);
  let players: Record<string, { display_name: string; avatar_emoji: string }> = {};
  if (playerIds.length > 0) {
    const { data: playerData } = await supabase
      .from("players")
      .select("id, display_name, avatar_emoji")
      .in("id", playerIds);
    if (playerData) {
      players = Object.fromEntries(
        playerData.map((p) => [
          p.id,
          { display_name: p.display_name, avatar_emoji: p.avatar_emoji },
        ])
      );
    }
  }

  return Response.json({
    event,
    leaderboard,
    players,
    allScores: matches || [],
  });
}
