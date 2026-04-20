import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";
import { advanceWinner, handleBossModeCompletion } from "@/lib/match-utils";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, match_id, player_id, winner_id, party_id, display_name, avatar_emoji, event_ids } = body;
  const supabase = createServerClient();

  // ── Ready up ──
  if (action === "ready") {
    if (!match_id || !player_id) {
      return Response.json({ error: "match_id and player_id required" }, { status: 400 });
    }
    const { data: match } = await supabase.from("matches").select("*").eq("id", match_id).single();
    if (!match) return Response.json({ error: "Match not found" }, { status: 404 });
    if (match.status !== "pending") return Response.json(match);

    const isA = player_id === match.player_a_id;
    const myField = isA ? "ready_a_id" : "ready_b_id";
    const theirField = isA ? "ready_b_id" : "ready_a_id";

    const update: Record<string, unknown> = { [myField]: player_id };
    if (match[theirField]) {
      update.status = "in_progress";
      update.called_at = new Date().toISOString();
    }

    const { data } = await supabase.from("matches").update(update).eq("id", match_id).eq("status", "pending").select().single();
    return Response.json(data || match);
  }

  // ── Call match (admin) ──
  if (action === "call") {
    if (!match_id) return Response.json({ error: "match_id required" }, { status: 400 });
    const { data } = await supabase.from("matches").update({ status: "in_progress", called_at: new Date().toISOString() }).eq("id", match_id).select().single();
    return Response.json(data);
  }

  // ── Report result ──
  if (action === "report") {
    if (!match_id || !player_id || !winner_id) {
      return Response.json({ error: "match_id, player_id, and winner_id required" }, { status: 400 });
    }
    const { data } = await supabase.from("matches").update({
      status: "pending_confirmation",
      reported_by_id: player_id,
      reported_winner_id: winner_id,
    }).eq("id", match_id).select().single();
    return Response.json(data);
  }

  // ── Confirm result ──
  if (action === "confirm") {
    if (!match_id || !player_id) {
      return Response.json({ error: "match_id and player_id required" }, { status: 400 });
    }
    const { data: match } = await supabase.from("matches").select("*").eq("id", match_id).single();
    if (!match) return Response.json({ error: "Match not found" }, { status: 404 });

    const { data } = await supabase.from("matches").update({
      status: "completed",
      winner_id: match.reported_winner_id,
      confirmed_by_id: player_id,
      completed_at: new Date().toISOString(),
    }).eq("id", match_id).select().single();

    if (data) {
      await advanceWinner(supabase, data);
      await handleBossModeCompletion(supabase, data);
    }
    return Response.json(data);
  }

  // ── Dispute ──
  if (action === "dispute") {
    if (!match_id) return Response.json({ error: "match_id required" }, { status: 400 });
    const { data } = await supabase.from("matches").update({ status: "disputed" }).eq("id", match_id).select().single();
    return Response.json(data);
  }

  // ── Resolve (admin picks winner) ──
  if (action === "resolve") {
    if (!match_id || !winner_id) {
      return Response.json({ error: "match_id and winner_id required" }, { status: 400 });
    }
    const { data } = await supabase.from("matches").update({
      status: "completed",
      winner_id,
      admin_resolved: true,
      completed_at: new Date().toISOString(),
    }).eq("id", match_id).select().single();

    if (data) {
      await advanceWinner(supabase, data);
      await handleBossModeCompletion(supabase, data);
    }
    return Response.json(data);
  }

  // ── Add late player ──
  if (action === "add_player") {
    if (!party_id || !display_name) {
      return Response.json({ error: "party_id and display_name required" }, { status: 400 });
    }
    const { data: player } = await supabase.from("players").insert({
      party_id,
      display_name,
      avatar_emoji: avatar_emoji || "🎮",
      session_token: `demo-${randomUUID()}`,
    }).select().single();

    if (player && event_ids?.length) {
      await supabase.from("event_entries").insert(
        event_ids.map((eid: string) => ({ event_id: eid, player_id: player.id }))
      );
    }
    return Response.json(player);
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}
