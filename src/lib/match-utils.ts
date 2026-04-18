import type { SupabaseClient } from "@supabase/supabase-js";

// Advance winner to the next round in a single-elim bracket
export async function advanceWinner(
  supabase: SupabaseClient,
  completedMatch: {
    event_id: string;
    round: number;
    bracket_position: number;
    winner_id: string | null;
    player_a_id: string | null;
    player_b_id: string | null;
  }
) {
  if (!completedMatch.winner_id) return;

  // Get the event to check format
  const { data: event } = await supabase
    .from("events")
    .select("format")
    .eq("id", completedMatch.event_id)
    .single();

  if (!event || event.format !== "single_elim") return;

  const nextRound = completedMatch.round + 1;
  const nextPos = Math.floor(completedMatch.bracket_position / 2);
  const slot =
    completedMatch.bracket_position % 2 === 0 ? "player_a_id" : "player_b_id";

  // Check if next round match exists
  const { data: nextMatch } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", completedMatch.event_id)
    .eq("round", nextRound)
    .eq("bracket_position", nextPos)
    .single();

  if (nextMatch) {
    await supabase
      .from("matches")
      .update({ [slot]: completedMatch.winner_id })
      .eq("id", nextMatch.id);
  }

  // Eliminate the loser
  const loserId =
    completedMatch.winner_id === completedMatch.player_a_id
      ? completedMatch.player_b_id
      : completedMatch.player_a_id;

  if (loserId) {
    await supabase
      .from("event_entries")
      .update({ eliminated: true })
      .eq("event_id", completedMatch.event_id)
      .eq("player_id", loserId);
  }

  // Check if this was the final — if no next match, declare event winner
  if (!nextMatch) {
    await supabase
      .from("events")
      .update({
        overall_winner_id: completedMatch.winner_id,
        status: "completed",
      })
      .eq("id", completedMatch.event_id);
  }
}

// Handle boss mode match completion: award Boss Slayer badges, check win condition
export async function handleBossModeCompletion(
  supabase: SupabaseClient,
  completedMatch: {
    event_id: string;
    winner_id: string | null;
    player_a_id: string | null;
    player_b_id: string | null;
  }
) {
  if (!completedMatch.winner_id) return;

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", completedMatch.event_id)
    .single();

  if (!event || event.format !== "boss_mode") return;

  const config = event.format_config as {
    boss_player_id: string;
    win_threshold_pct: number;
    boss_slayer_bonus: boolean;
  };

  // Award Boss Slayer badge if challenger beat the boss
  if (
    config.boss_slayer_bonus &&
    completedMatch.winner_id !== config.boss_player_id
  ) {
    // Check if badge already exists to avoid duplicates
    const { data: existing } = await supabase
      .from("badges")
      .select("id")
      .eq("player_id", completedMatch.winner_id)
      .eq("badge_type", "boss_slayer")
      .eq("event_id", completedMatch.event_id);

    if (!existing || existing.length === 0) {
      await supabase.from("badges").insert({
        player_id: completedMatch.winner_id,
        badge_type: "boss_slayer",
        event_id: completedMatch.event_id,
      });
    }
  }

  // Check if all boss matches are complete
  const { data: allMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", completedMatch.event_id);

  if (!allMatches) return;

  const completed = allMatches.filter((m) => m.status === "completed");
  if (completed.length < allMatches.length) return; // Still matches to play

  // All matches done — determine winner
  const bossWins = completed.filter(
    (m) => m.winner_id === config.boss_player_id
  ).length;
  const winPct = (bossWins / completed.length) * 100;

  let winnerId: string;
  if (winPct >= config.win_threshold_pct) {
    // Boss wins
    winnerId = config.boss_player_id;
  } else {
    // Top boss slayer wins
    // Find player with the most wins against boss
    const slayerWins = new Map<string, number>();
    for (const m of completed) {
      if (m.winner_id && m.winner_id !== config.boss_player_id) {
        slayerWins.set(m.winner_id, (slayerWins.get(m.winner_id) || 0) + 1);
      }
    }
    // Get top slayer (most wins against boss — in boss mode each plays once,
    // so it's either 0 or 1, but this handles future multi-match scenarios)
    let topSlayer = "";
    let topWins = 0;
    for (const [playerId, wins] of slayerWins) {
      if (wins > topWins) {
        topSlayer = playerId;
        topWins = wins;
      }
    }
    winnerId = topSlayer || config.boss_player_id;
  }

  await supabase
    .from("events")
    .update({ overall_winner_id: winnerId, status: "completed" })
    .eq("id", completedMatch.event_id);
}
