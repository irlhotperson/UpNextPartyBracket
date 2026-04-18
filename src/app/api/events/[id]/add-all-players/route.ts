import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const supabase = createServerClient();

  // Get the event to find the party
  const { data: event } = await supabase
    .from("events")
    .select("party_id")
    .eq("id", eventId)
    .single();

  if (!event) {
    return Response.json({ error: "Event not found" }, { status: 404 });
  }

  // Get all players in the party
  const { data: players } = await supabase
    .from("players")
    .select("id")
    .eq("party_id", event.party_id);

  if (!players || players.length === 0) {
    return Response.json({ error: "No players in party" }, { status: 400 });
  }

  // Get existing entries to avoid duplicates
  const { data: existing } = await supabase
    .from("event_entries")
    .select("player_id")
    .eq("event_id", eventId);

  const existingIds = new Set(existing?.map((e) => e.player_id) || []);
  const newEntries = players
    .filter((p) => !existingIds.has(p.id))
    .map((p) => ({ event_id: eventId, player_id: p.id }));

  if (newEntries.length === 0) {
    return Response.json({ added: 0, message: "All players already entered" });
  }

  await supabase.from("event_entries").insert(newEntries);

  return Response.json({ added: newEntries.length });
}
