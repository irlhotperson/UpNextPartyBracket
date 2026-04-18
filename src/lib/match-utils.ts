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
