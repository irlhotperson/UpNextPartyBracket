import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";
import { randomUUID } from "crypto";

const DEMO_PLAYERS = [
  { display_name: "Ryu", avatar_emoji: "🔥" },
  { display_name: "Ken", avatar_emoji: "👊" },
  { display_name: "Chun-Li", avatar_emoji: "⚡" },
  { display_name: "Guile", avatar_emoji: "🇺🇸" },
  { display_name: "Blanka", avatar_emoji: "🐸" },
  { display_name: "Dhalsim", avatar_emoji: "🧘" },
  { display_name: "Zangief", avatar_emoji: "🐻" },
  { display_name: "E. Honda", avatar_emoji: "🏔️" },
];

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();

  // Create party
  const { data: party, error: partyErr } = await supabase
    .from("parties")
    .insert({ name: `Demo Party ${new Date().toLocaleTimeString()}` })
    .select()
    .single();

  if (partyErr || !party) {
    return Response.json({ error: partyErr?.message }, { status: 500 });
  }

  // Create players
  const playerInserts = DEMO_PLAYERS.map((p) => ({
    party_id: party.id,
    display_name: p.display_name,
    avatar_emoji: p.avatar_emoji,
    session_token: `demo-${randomUUID()}`,
  }));

  const { data: players, error: playersErr } = await supabase
    .from("players")
    .insert(playerInserts)
    .select();

  if (playersErr || !players) {
    return Response.json({ error: playersErr?.message }, { status: 500 });
  }

  // Create events
  const eventInserts = [
    {
      party_id: party.id,
      name: "Ping Pong",
      format: "boss_mode" as const,
      format_config: {
        boss_player_id: players[0].id, // Ryu is the boss
        win_threshold_pct: 51,
        boss_slayer_bonus: true,
      },
      station_label: "Ping Pong Table",
    },
    {
      party_id: party.id,
      name: "Beer Pong",
      format: "single_elim" as const,
      format_config: { best_of: 1, allow_late_entry: true },
      station_label: "Beer Pong Table",
    },
    {
      party_id: party.id,
      name: "Golden Tee",
      format: "single_elim" as const,
      format_config: { best_of: 1, allow_late_entry: true },
      station_label: "Golden Tee Cabinet",
    },
  ];

  const { data: events, error: eventsErr } = await supabase
    .from("events")
    .insert(eventInserts)
    .select();

  if (eventsErr || !events) {
    return Response.json({ error: eventsErr?.message }, { status: 500 });
  }

  // Create event entries — all players in all events
  const entries = events.flatMap((event) =>
    players.map((player) => ({
      event_id: event.id,
      player_id: player.id,
    }))
  );

  await supabase.from("event_entries").insert(entries);

  return Response.json({ party, players, events }, { status: 201 });
}
