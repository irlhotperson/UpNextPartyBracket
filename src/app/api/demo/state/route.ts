import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const partyId = searchParams.get("party_id");
  if (!partyId) {
    return Response.json({ error: "party_id required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: party } = await supabase.from("parties").select("*").eq("id", partyId).single();
  const { data: players } = await supabase.from("players").select("*").eq("party_id", partyId).order("joined_at");
  const { data: events } = await supabase.from("events").select("*").eq("party_id", partyId).order("created_at");
  const { data: entries } = await supabase.from("event_entries").select("*").in("event_id", events?.map((e) => e.id) || []);

  const eventIds = events?.map((e) => e.id) || [];
  const { data: matches } = await supabase.from("matches").select("*").in("event_id", eventIds).order("round").order("bracket_position");

  // Build per-event stats
  const eventStats = events?.map((event) => {
    const eventMatches = matches?.filter((m) => m.event_id === event.id) || [];
    const eventEntries = entries?.filter((e) => e.event_id === event.id) || [];

    const matchCounts = {
      pending: eventMatches.filter((m) => m.status === "pending").length,
      in_progress: eventMatches.filter((m) => m.status === "in_progress").length,
      pending_confirmation: eventMatches.filter((m) => m.status === "pending_confirmation").length,
      disputed: eventMatches.filter((m) => m.status === "disputed").length,
      completed: eventMatches.filter((m) => m.status === "completed").length,
      total: eventMatches.length,
    };

    const problems: string[] = [];
    if (event.status === "active" && eventMatches.length === 0) {
      problems.push("Active but no matches generated");
    }
    if (eventEntries.length === 0) {
      problems.push("No players entered");
    }
    const playersWithoutEntries = players?.filter(
      (p) => !eventEntries.some((e) => e.player_id === p.id)
    ) || [];
    if (playersWithoutEntries.length > 0 && eventEntries.length > 0) {
      problems.push(`${playersWithoutEntries.length} player(s) not entered`);
    }
    if (matchCounts.disputed > 0) {
      problems.push(`${matchCounts.disputed} disputed match(es)`);
    }
    const stalled = eventMatches.filter((m) => {
      if (m.status !== "in_progress" || !m.called_at) return false;
      return Date.now() - new Date(m.called_at).getTime() > 10 * 60 * 1000;
    });
    if (stalled.length > 0) {
      problems.push(`${stalled.length} match(es) stalled >10min`);
    }

    return {
      ...event,
      entryCount: eventEntries.length,
      matchCounts,
      problems,
      matches: eventMatches,
    };
  });

  return Response.json({
    party,
    players: players || [],
    events: eventStats || [],
    totalMatches: matches?.length || 0,
  });
}
