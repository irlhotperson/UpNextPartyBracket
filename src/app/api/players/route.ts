import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export async function POST(request: Request) {
  const body = await request.json();
  const { party_id, display_name, avatar_emoji, event_ids } = body;

  if (!party_id || !display_name || !avatar_emoji) {
    return Response.json(
      { error: "party_id, display_name, and avatar_emoji are required" },
      { status: 400 }
    );
  }

  const sessionToken = randomUUID();
  const supabase = createServerClient();

  // Create player
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      party_id,
      display_name: display_name.trim(),
      avatar_emoji,
      session_token: sessionToken,
    })
    .select()
    .single();

  if (playerError) {
    return Response.json({ error: playerError.message }, { status: 500 });
  }

  // Create event entries
  if (event_ids && event_ids.length > 0) {
    const entries = event_ids.map((eventId: string) => ({
      event_id: eventId,
      player_id: player.id,
    }));
    await supabase.from("event_entries").insert(entries);
  }

  // Set session cookie
  const cookieStore = await cookies();
  cookieStore.set("player_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return Response.json(player, { status: 201 });
}

// Get current player from session
export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("player_session");

  if (!session) {
    return Response.json({ error: "No session" }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data: player, error } = await supabase
    .from("players")
    .select("*")
    .eq("session_token", session.value)
    .single();

  if (error || !player) {
    return Response.json({ error: "Player not found" }, { status: 404 });
  }

  return Response.json(player);
}
