import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";
import { generateSingleElimBracket } from "@/lib/bracket";

// Start Hot Streak Round 1
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

  if (!event || event.format !== "hot_streak") {
    return Response.json({ error: "Not a hot_streak event" }, { status: 400 });
  }

  const config = event.format_config as {
    round1_streak_target: number;
    max_qualifiers: number;
    round2_format: string;
    round2_streak_target: number;
  };

  if (action === "start") {
    // Start Round 1: create first match from first two players in queue
    const { data: entries } = await supabase
      .from("event_entries")
      .select("player_id")
      .eq("event_id", eventId)
      .eq("eliminated", false)
      .eq("qualified", false);

    if (!entries || entries.length < 2) {
      return Response.json(
        { error: "Need at least 2 players" },
        { status: 400 }
      );
    }

    // Shuffle for random order
    const queue = entries
      .map((e) => e.player_id)
      .sort(() => Math.random() - 0.5);

    // Delete existing matches
    await supabase.from("matches").delete().eq("event_id", eventId);

    // Create first match
    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        event_id: eventId,
        round: 1,
        bracket_position: 0,
        player_a_id: queue[0],
        player_b_id: queue[1],
        status: "pending",
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Set event active
    await supabase
      .from("events")
      .update({ status: "active" })
      .eq("id", eventId);

    return Response.json({ match, queue: queue.slice(2) }, { status: 201 });
  }

  if (action === "next_match") {
    // Called after a Round 1 match completes to queue the next challenger
    const { winner_id } = body;
    if (!winner_id) {
      return Response.json({ error: "winner_id required" }, { status: 400 });
    }

    // Count winner's current streak
    const { data: recentMatches } = await supabase
      .from("matches")
      .select("*")
      .eq("event_id", eventId)
      .eq("round", 1)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    let streak = 0;
    if (recentMatches) {
      for (const m of recentMatches) {
        if (m.winner_id === winner_id) {
          streak++;
        } else {
          break;
        }
      }
    }

    // Check if winner qualified
    if (streak >= config.round1_streak_target) {
      // Player qualifies!
      await supabase
        .from("event_entries")
        .update({ qualified: true })
        .eq("event_id", eventId)
        .eq("player_id", winner_id);

      // Check how many have qualified
      const { data: qualified } = await supabase
        .from("event_entries")
        .select("player_id")
        .eq("event_id", eventId)
        .eq("qualified", true);

      if (qualified && qualified.length >= config.max_qualifiers) {
        // All slots filled — start Round 2
        return Response.json({
          qualified: true,
          all_slots_filled: true,
          qualifiers: qualified.map((q) => q.player_id),
        });
      }

      // More spots available — continue Round 1 with remaining players
      // Get unqualified, non-eliminated players
      const { data: remaining } = await supabase
        .from("event_entries")
        .select("player_id")
        .eq("event_id", eventId)
        .eq("eliminated", false)
        .eq("qualified", false);

      if (!remaining || remaining.length < 2) {
        return Response.json({
          qualified: true,
          all_slots_filled: false,
          not_enough_players: true,
          qualifiers: qualified?.map((q) => q.player_id) || [],
        });
      }

      // Pick next two for a fresh match
      const nextTwo = remaining
        .map((r) => r.player_id)
        .sort(() => Math.random() - 0.5);

      const maxPos =
        recentMatches?.reduce(
          (max, m) => Math.max(max, m.bracket_position),
          0
        ) || 0;

      const { data: nextMatch } = await supabase
        .from("matches")
        .insert({
          event_id: eventId,
          round: 1,
          bracket_position: maxPos + 1,
          player_a_id: nextTwo[0],
          player_b_id: nextTwo[1],
          status: "pending",
        })
        .select()
        .single();

      return Response.json({
        qualified: true,
        all_slots_filled: false,
        next_match: nextMatch,
      });
    }

    // Winner continues — loser goes to back of queue
    // Find next challenger from non-playing, non-eliminated, non-qualified players
    const { data: available } = await supabase
      .from("event_entries")
      .select("player_id")
      .eq("event_id", eventId)
      .eq("eliminated", false)
      .eq("qualified", false);

    if (!available) {
      return Response.json({ error: "No available players" }, { status: 400 });
    }

    // Filter out the current winner (they're the throne holder)
    const challengers = available
      .map((a) => a.player_id)
      .filter((id) => id !== winner_id);

    if (challengers.length === 0) {
      // Winner is the only one left — auto-qualify
      await supabase
        .from("event_entries")
        .update({ qualified: true })
        .eq("event_id", eventId)
        .eq("player_id", winner_id);

      return Response.json({ auto_qualified: true, winner_id });
    }

    // Pick the next challenger (could be the recent loser if they're still in)
    const nextChallenger = challengers[Math.floor(Math.random() * challengers.length)];

    const maxPos2 =
      recentMatches?.reduce(
        (max, m) => Math.max(max, m.bracket_position),
        0
      ) || 0;

    const { data: nextMatch } = await supabase
      .from("matches")
      .insert({
        event_id: eventId,
        round: 1,
        bracket_position: maxPos2 + 1,
        player_a_id: winner_id,
        player_b_id: nextChallenger,
        status: "pending",
      })
      .select()
      .single();

    return Response.json({ streak, next_match: nextMatch });
  }

  if (action === "start_round2") {
    // Generate Round 2 bracket from qualifiers
    const { data: qualifiers } = await supabase
      .from("event_entries")
      .select("player_id")
      .eq("event_id", eventId)
      .eq("qualified", true);

    if (!qualifiers || qualifiers.length < 2) {
      return Response.json(
        { error: "Need at least 2 qualifiers for Round 2" },
        { status: 400 }
      );
    }

    const qualifierIds = qualifiers.map((q) => q.player_id);

    // Delete Round 1 matches (keep history? For now, keep them as round 1)
    // Generate Round 2 bracket
    const bracketMatches = generateSingleElimBracket(qualifierIds);

    const matchInserts = bracketMatches.map((m) => ({
      event_id: eventId,
      round: m.round + 100, // Offset round numbers to separate from R1
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

    // Process bye winners
    const byeMatches = insertedMatches?.filter(
      (m) => m.status === "completed" && m.winner_id
    );
    if (byeMatches) {
      for (const byeMatch of byeMatches) {
        const nextRound = byeMatch.round + 1;
        const nextPos = Math.floor(byeMatch.bracket_position / 2);
        const slot =
          byeMatch.bracket_position % 2 === 0 ? "player_a_id" : "player_b_id";

        await supabase
          .from("matches")
          .update({ [slot]: byeMatch.winner_id })
          .eq("event_id", eventId)
          .eq("round", nextRound)
          .eq("bracket_position", nextPos);
      }
    }

    return Response.json({ round2_matches: insertedMatches }, { status: 201 });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

// Get Hot Streak status
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

  if (!event || event.format !== "hot_streak") {
    return Response.json({ error: "Not a hot_streak event" }, { status: 400 });
  }

  const config = event.format_config as {
    round1_streak_target: number;
    max_qualifiers: number;
    round2_format: string;
  };

  // Get all matches
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", eventId)
    .order("bracket_position");

  // Get entries
  const { data: entries } = await supabase
    .from("event_entries")
    .select("*")
    .eq("event_id", eventId);

  const qualifiers = entries?.filter((e) => e.qualified) || [];
  const round1Matches = matches?.filter((m) => m.round <= 100) || [];
  const round2Matches = matches?.filter((m) => m.round > 100) || [];

  // Calculate current streak for the throne holder
  let currentStreak = 0;
  let throneHolder: string | null = null;
  const completedR1 = round1Matches
    .filter((m) => m.status === "completed")
    .sort(
      (a, b) =>
        new Date(b.completed_at || 0).getTime() -
        new Date(a.completed_at || 0).getTime()
    );

  if (completedR1.length > 0) {
    throneHolder = completedR1[0].winner_id;
    for (const m of completedR1) {
      if (m.winner_id === throneHolder) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Get player info
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

  return Response.json({
    event,
    config,
    round1Matches,
    round2Matches,
    qualifiers: qualifiers.map((q) => q.player_id),
    currentStreak,
    throneHolder,
    players,
    entries: entries || [],
  });
}
