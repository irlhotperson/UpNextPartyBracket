"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Player, Event, Match, Badge, EventEntry } from "@/lib/types";

interface EventState extends Event {
  entryCount: number;
  matchCounts: Record<string, number>;
  problems: string[];
  matches: Match[];
}

interface StateData {
  party: { id: string; name: string; status: string };
  players: Player[];
  events: EventState[];
  totalMatches: number;
}

interface LobbyData {
  player: Player;
  entries: (EventEntry & { events: Event })[];
  matches: (Match & { events: Event })[];
  opponents: Record<string, { display_name: string; avatar_emoji: string }>;
  badges: Badge[];
}

export default function DemoPage() {
  const [partyId, setPartyId] = useState<string | null>(null);
  const [state, setState] = useState<StateData | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLog((prev) => [...prev.slice(-100), `[${ts}] ${msg}`]);
  }, []);

  const refreshState = useCallback(async () => {
    if (!partyId) return;
    const res = await fetch(`/api/demo/state?party_id=${partyId}`);
    if (res.ok) setState(await res.json());
  }, [partyId]);

  const refreshLobby = useCallback(async () => {
    if (!selectedPlayer) return;
    const res = await fetch(`/api/demo/lobby/${selectedPlayer}`);
    if (res.ok) setLobbyData(await res.json());
  }, [selectedPlayer]);

  const refreshAll = useCallback(() => {
    refreshState();
    refreshLobby();
  }, [refreshState, refreshLobby]);

  // Realtime subscription
  useEffect(() => {
    if (!partyId) return;
    refreshState();

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("demo-sandbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => refreshAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_entries" }, () => refreshAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => refreshAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "badges" }, () => refreshAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partyId, refreshAll, refreshState]);

  useEffect(() => {
    if (selectedPlayer) refreshLobby();
  }, [selectedPlayer, refreshLobby]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // ── API helpers ──

  async function simulate(action: string, params: Record<string, unknown>) {
    const res = await fetch("/api/demo/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    const data = await res.json();
    addLog(`${action}: ${JSON.stringify(params).slice(0, 80)}${res.ok ? " ✓" : ` ✗ ${data.error}`}`);
    refreshAll();
    return data;
  }

  async function seedParty() {
    setSeeding(true);
    const res = await fetch("/api/demo/seed", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setPartyId(data.party.id);
      addLog(`Seeded party "${data.party.name}" with ${data.players.length} players, ${data.events.length} events`);
    }
    setSeeding(false);
  }

  async function startEvent(eventId: string, format: string) {
    const urls: Record<string, string> = {
      single_elim: `/api/events/${eventId}/bracket`,
      boss_mode: `/api/events/${eventId}/boss`,
      hot_streak: `/api/events/${eventId}/hotstreak`,
      best_score: `/api/events/${eventId}/bestscore`,
    };
    const res = await fetch(urls[format], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    addLog(`Start event ${format}: ${res.ok ? "✓" : "✗"}`);
    refreshAll();
  }

  async function nukeParty() {
    if (!partyId || !confirm("Delete this demo party and all data?")) return;
    await fetch(`/api/parties/${partyId}`, { method: "DELETE" });
    addLog("Party nuked");
    setPartyId(null);
    setState(null);
    setLobbyData(null);
    setSelectedPlayer(null);
  }

  async function autoPlayRound(eventId: string) {
    setAutoPlaying(true);
    addLog("Auto-playing round...");

    // Refresh to get latest matches
    const stateRes = await fetch(`/api/demo/state?party_id=${partyId}`);
    if (!stateRes.ok) { setAutoPlaying(false); return; }
    const freshState: StateData = await stateRes.json();
    const event = freshState.events.find((e) => e.id === eventId);
    if (!event) { setAutoPlaying(false); return; }

    const pending = event.matches.filter(
      (m) => m.status === "pending" && m.player_a_id && m.player_b_id
    );

    for (const match of pending) {
      // Call match
      await simulate("call", { match_id: match.id });
      await new Promise((r) => setTimeout(r, 300));

      // Random winner
      const winner = Math.random() > 0.5 ? match.player_a_id : match.player_b_id;
      const loser = winner === match.player_a_id ? match.player_b_id : match.player_a_id;

      // Report by loser
      await simulate("report", { match_id: match.id, player_id: loser, winner_id: winner });
      await new Promise((r) => setTimeout(r, 200));

      // Confirm by winner
      await simulate("confirm", { match_id: match.id, player_id: winner });
      await new Promise((r) => setTimeout(r, 300));
    }

    addLog(`Auto-played ${pending.length} matches`);
    setAutoPlaying(false);
    refreshAll();
  }

  async function autoPlayFull(eventId: string) {
    setAutoPlaying(true);
    addLog("Simulating full tournament...");

    for (let round = 0; round < 10; round++) {
      const stateRes = await fetch(`/api/demo/state?party_id=${partyId}`);
      if (!stateRes.ok) break;
      const freshState: StateData = await stateRes.json();
      const event = freshState.events.find((e) => e.id === eventId);
      if (!event) break;

      const pending = event.matches.filter(
        (m) => m.status === "pending" && m.player_a_id && m.player_b_id
      );
      if (pending.length === 0) {
        addLog("No more playable matches — tournament complete");
        break;
      }

      for (const match of pending) {
        const winner = Math.random() > 0.5 ? match.player_a_id : match.player_b_id;
        await simulate("resolve", { match_id: match.id, winner_id: winner });
        await new Promise((r) => setTimeout(r, 150));
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    setAutoPlaying(false);
    refreshAll();
  }

  async function addLateArrival() {
    if (!partyId || !state) return;
    const names = ["Sagat", "Vega", "Balrog", "M. Bison", "Cammy", "Fei Long", "T. Hawk", "Dee Jay"];
    const emojis = ["🐯", "🦇", "🥊", "💀", "🐱", "🐲", "🦅", "🎶"];
    const idx = (state.players.length - 8) % names.length;

    await simulate("add_player", {
      party_id: partyId,
      display_name: names[idx] || `Fighter ${state.players.length + 1}`,
      avatar_emoji: emojis[idx] || "🎮",
      event_ids: state.events.map((e) => e.id),
    });
  }

  // ── Player name helper ──
  function pName(id: string | null): string {
    if (!id || !state) return "TBD";
    const p = state.players.find((p) => p.id === id);
    return p ? `${p.avatar_emoji} ${p.display_name}` : id.slice(0, 8);
  }

  // ── Render ──

  return (
    <div className="min-h-screen bg-arcade-dark text-foreground">
      {/* Header */}
      <div className="border-b-2 border-arcade-border px-4 py-3 flex items-center justify-between">
        <h1
          className="pixel-text font-heading text-arcade-yellow text-xs"
          style={{ textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000" }}
        >
          DEMO SANDBOX
        </h1>
        <div className="flex gap-2">
          <button
            onClick={seedParty}
            disabled={seeding}
            className="border border-arcade-green bg-arcade-green/20 px-3 py-1 font-heading text-[10px] text-arcade-green hover:bg-arcade-green/40 pixel-text"
          >
            {seeding ? "SEEDING..." : "SEED NEW PARTY"}
          </button>
          {partyId && (
            <button
              onClick={nukeParty}
              className="border border-arcade-red bg-arcade-red/20 px-3 py-1 font-heading text-[10px] text-arcade-red hover:bg-arcade-red/40 pixel-text"
            >
              NUKE PARTY
            </button>
          )}
          <a
            href="/admin"
            className="pixel-text font-heading text-arcade-cyan text-[10px] hover:text-arcade-blue px-2 py-1"
          >
            ← ADMIN
          </a>
        </div>
      </div>

      {!partyId && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="pixel-text font-heading text-arcade-border text-xs mb-4">
              NO DEMO PARTY LOADED
            </p>
            <button
              onClick={seedParty}
              disabled={seeding}
              className="border-2 border-arcade-yellow bg-arcade-yellow/20 px-8 py-4 font-heading text-sm text-arcade-yellow hover:bg-arcade-yellow/40 pixel-text"
              style={{ boxShadow: "0 0 15px rgba(255,215,0,0.3), 4px 4px 0 #ff2d9b" }}
            >
              {seeding ? "CREATING..." : "CREATE DEMO PARTY"}
            </button>
            <p className="pixel-text font-sans text-arcade-border text-sm mt-4">
              Seeds 8 players, 3 events (Boss Mode, 2x Single Elim)
            </p>
          </div>
        </div>
      )}

      {partyId && state && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 lg:gap-0">
          {/* LEFT: Admin Panel (3 cols) */}
          <div className="lg:col-span-3 border-r-0 lg:border-r-2 border-arcade-border">
            {/* Party info bar */}
            <div className="border-b border-arcade-border px-4 py-2 flex items-center justify-between">
              <div>
                <span className="pixel-text font-heading text-foreground text-[10px]">
                  {state.party.name}
                </span>
                <span className={`pixel-text font-heading text-[8px] ml-2 ${
                  state.party.status === "active" ? "text-arcade-green" :
                  state.party.status === "completed" ? "text-arcade-magenta" : "text-arcade-border"
                }`}>
                  {state.party.status.toUpperCase()}
                </span>
                <span className="pixel-text font-sans text-arcade-border text-xs ml-2">
                  {state.players.length} players · {state.totalMatches} matches
                </span>
              </div>
              <button
                onClick={addLateArrival}
                className="border border-arcade-orange bg-arcade-orange/10 px-2 py-1 font-heading text-[8px] text-arcade-orange hover:bg-arcade-orange/30 pixel-text"
              >
                + LATE ARRIVAL
              </button>
            </div>

            {/* Events */}
            <div className="p-3 space-y-3 max-h-[55vh] overflow-y-auto">
              {state.events.map((event) => (
                <div key={event.id} className="border-2 border-arcade-border bg-arcade-navy p-3">
                  {/* Event header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="pixel-text font-heading text-foreground text-[10px]">
                        {event.name}
                      </span>
                      <span className={`pixel-text font-heading text-[8px] ${
                        event.format === "boss_mode" ? "text-arcade-red" :
                        event.format === "single_elim" ? "text-arcade-blue" :
                        "text-arcade-orange"
                      }`}>
                        {event.format.toUpperCase().replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`pixel-text font-heading text-[8px] ${
                        event.status === "active" ? "text-arcade-green" :
                        event.status === "completed" ? "text-arcade-magenta" : "text-arcade-border"
                      }`}>
                        {event.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Match counts */}
                  <div className="flex gap-2 mb-2 text-[8px]">
                    {event.matchCounts.pending > 0 && (
                      <span className="pixel-text text-arcade-border">⏳{event.matchCounts.pending}</span>
                    )}
                    {event.matchCounts.in_progress > 0 && (
                      <span className="pixel-text text-arcade-green">▶{event.matchCounts.in_progress}</span>
                    )}
                    {event.matchCounts.pending_confirmation > 0 && (
                      <span className="pixel-text text-arcade-yellow">⏸{event.matchCounts.pending_confirmation}</span>
                    )}
                    {event.matchCounts.disputed > 0 && (
                      <span className="pixel-text text-arcade-red">⚠{event.matchCounts.disputed}</span>
                    )}
                    {event.matchCounts.completed > 0 && (
                      <span className="pixel-text text-arcade-magenta">✓{event.matchCounts.completed}</span>
                    )}
                    <span className="pixel-text text-arcade-border">({event.entryCount} players)</span>
                  </div>

                  {/* Problems */}
                  {event.problems.length > 0 && (
                    <div className="mb-2">
                      {event.problems.map((p, i) => (
                        <p key={i} className="pixel-text font-heading text-arcade-red text-[8px]">
                          ⚠ {p}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {event.status === "setup" && (
                      <button
                        onClick={() => startEvent(event.id, event.format)}
                        className="border border-arcade-green bg-arcade-green/10 px-2 py-1 font-heading text-[8px] text-arcade-green hover:bg-arcade-green/30 pixel-text"
                      >
                        START
                      </button>
                    )}
                    {event.status === "active" && (
                      <>
                        <button
                          onClick={() => autoPlayRound(event.id)}
                          disabled={autoPlaying}
                          className="border border-arcade-cyan bg-arcade-cyan/10 px-2 py-1 font-heading text-[8px] text-arcade-cyan hover:bg-arcade-cyan/30 pixel-text"
                        >
                          AUTO-PLAY ROUND
                        </button>
                        <button
                          onClick={() => autoPlayFull(event.id)}
                          disabled={autoPlaying}
                          className="border border-arcade-magenta bg-arcade-magenta/10 px-2 py-1 font-heading text-[8px] text-arcade-magenta hover:bg-arcade-magenta/30 pixel-text"
                        >
                          SIM FULL TOURNEY
                        </button>
                      </>
                    )}
                  </div>

                  {/* Matches */}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {event.matches
                      .filter((m) => m.status !== "completed")
                      .map((match) => (
                        <DemoMatchCard
                          key={match.id}
                          match={match}
                          pName={pName}
                          simulate={simulate}
                        />
                      ))}
                    {event.matches.filter((m) => m.status === "completed").length > 0 && (
                      <details className="mt-1">
                        <summary className="pixel-text font-heading text-arcade-border text-[8px] cursor-pointer">
                          {event.matches.filter((m) => m.status === "completed").length} completed
                        </summary>
                        <div className="space-y-1 mt-1">
                          {event.matches
                            .filter((m) => m.status === "completed")
                            .map((match) => (
                              <div key={match.id} className="border border-arcade-border/30 px-2 py-1 opacity-50">
                                <span className="pixel-text text-[8px] text-foreground">
                                  R{match.round} #{match.bracket_position}: {pName(match.player_a_id)} vs {pName(match.player_b_id)} → {pName(match.winner_id)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Log */}
            <div className="border-t-2 border-arcade-border">
              <div className="px-3 py-1 border-b border-arcade-border">
                <span className="pixel-text font-heading text-arcade-green text-[8px]">ACTION LOG</span>
              </div>
              <div
                ref={logRef}
                className="px-3 py-2 h-32 overflow-y-auto font-mono text-xs"
                style={{ color: "#39ff14", background: "#030806" }}
              >
                {log.length === 0 && (
                  <p className="opacity-50">Seed a party to start...</p>
                )}
                {log.map((entry, i) => (
                  <p key={i} className="leading-tight">{entry}</p>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Player View + TV (2 cols) */}
          <div className="lg:col-span-2">
            {/* Player selector */}
            <div className="border-b border-arcade-border px-3 py-2">
              <label className="pixel-text font-heading text-arcade-cyan text-[8px] block mb-1">
                PLAYER PERSPECTIVE
              </label>
              <select
                value={selectedPlayer || ""}
                onChange={(e) => setSelectedPlayer(e.target.value || null)}
                className="w-full bg-arcade-dark border border-arcade-border px-2 py-1.5 font-sans text-sm text-foreground focus:outline-none focus:border-arcade-cyan"
              >
                <option value="">-- Select a player --</option>
                {state.players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.avatar_emoji} {p.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Player lobby view */}
            {selectedPlayer && lobbyData && (
              <div className="p-3 max-h-[40vh] overflow-y-auto">
                <div className="text-center mb-3">
                  <span className="text-3xl">{lobbyData.player.avatar_emoji}</span>
                  <p className="pixel-text font-heading text-arcade-yellow text-[10px] mt-1">
                    {lobbyData.player.display_name}
                  </p>
                </div>

                {/* Player matches with action buttons */}
                {lobbyData.matches.length > 0 && (
                  <div className="space-y-2">
                    <p className="pixel-text font-heading text-arcade-blue text-[8px]">MATCHES</p>
                    {lobbyData.matches.map((match) => {
                      const opId = match.player_a_id === selectedPlayer ? match.player_b_id : match.player_a_id;
                      const opName = opId ? lobbyData.opponents[opId]?.display_name || "?" : "TBD";
                      const isA = match.player_a_id === selectedPlayer;

                      return (
                        <div key={match.id} className={`border p-2 ${
                          match.status === "in_progress" ? "border-arcade-green bg-arcade-green/5" :
                          match.status === "pending_confirmation" ? "border-arcade-yellow bg-arcade-yellow/5" :
                          match.status === "disputed" ? "border-arcade-red bg-arcade-red/5" :
                          "border-arcade-border bg-arcade-navy"
                        }`}>
                          <p className="pixel-text text-[9px] text-foreground">
                            vs {opName} @ {match.events?.station_label || match.events?.name}
                          </p>
                          <p className={`pixel-text text-[8px] ${
                            match.status === "in_progress" ? "text-arcade-green" :
                            match.status === "pending_confirmation" ? "text-arcade-yellow" :
                            match.status === "disputed" ? "text-arcade-red" :
                            "text-arcade-border"
                          }`}>
                            {match.status.toUpperCase().replace("_", " ")}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {match.status === "pending" && match.player_a_id && match.player_b_id && (
                              <button
                                onClick={() => simulate("ready", { match_id: match.id, player_id: selectedPlayer })}
                                className={`px-2 py-0.5 font-heading text-[8px] pixel-text border ${
                                  (isA && match.ready_a_id) || (!isA && match.ready_b_id)
                                    ? "border-arcade-cyan text-arcade-cyan"
                                    : "border-arcade-green text-arcade-green bg-arcade-green/10 hover:bg-arcade-green/30"
                                }`}
                                disabled={!!(isA ? match.ready_a_id : match.ready_b_id)}
                              >
                                {(isA ? match.ready_a_id : match.ready_b_id) ? "READY ✓" : "READY"}
                              </button>
                            )}
                            {match.status === "in_progress" && (
                              <>
                                <button
                                  onClick={() => simulate("report", { match_id: match.id, player_id: selectedPlayer, winner_id: selectedPlayer })}
                                  className="px-2 py-0.5 font-heading text-[8px] pixel-text border border-arcade-green text-arcade-green hover:bg-arcade-green/20"
                                >
                                  I WON
                                </button>
                                <button
                                  onClick={() => simulate("report", { match_id: match.id, player_id: selectedPlayer, winner_id: opId })}
                                  className="px-2 py-0.5 font-heading text-[8px] pixel-text border border-arcade-red text-arcade-red hover:bg-arcade-red/20"
                                >
                                  THEY WON
                                </button>
                              </>
                            )}
                            {match.status === "pending_confirmation" && match.reported_by_id !== selectedPlayer && (
                              <>
                                <button
                                  onClick={() => simulate("confirm", { match_id: match.id, player_id: selectedPlayer })}
                                  className="px-2 py-0.5 font-heading text-[8px] pixel-text border border-arcade-green text-arcade-green hover:bg-arcade-green/20"
                                >
                                  CONFIRM
                                </button>
                                <button
                                  onClick={() => simulate("dispute", { match_id: match.id, player_id: selectedPlayer })}
                                  className="px-2 py-0.5 font-heading text-[8px] pixel-text border border-arcade-red text-arcade-red hover:bg-arcade-red/20"
                                >
                                  DISPUTE
                                </button>
                              </>
                            )}
                            {match.status === "pending_confirmation" && match.reported_by_id === selectedPlayer && (
                              <span className="pixel-text text-[8px] text-arcade-yellow">Waiting for confirm...</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Player events */}
                {lobbyData.entries.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="pixel-text font-heading text-arcade-blue text-[8px]">EVENTS</p>
                    {lobbyData.entries.map((entry) => (
                      <div key={entry.id} className="flex justify-between border border-arcade-border px-2 py-1">
                        <span className="pixel-text text-[8px] text-foreground">{entry.events?.name}</span>
                        <span className={`pixel-text text-[8px] ${
                          entry.eliminated ? "text-arcade-red" :
                          entry.qualified ? "text-arcade-green" :
                          "text-arcade-border"
                        }`}>
                          {entry.eliminated ? "OUT" : entry.qualified ? "QUALIFIED" : entry.events?.status?.toUpperCase() || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedPlayer && (
              <div className="flex items-center justify-center py-10">
                <p className="pixel-text font-sans text-arcade-border text-sm">
                  Select a player above
                </p>
              </div>
            )}

            {/* TV Preview */}
            {partyId && (
              <div className="border-t-2 border-arcade-border">
                <div className="px-3 py-1 border-b border-arcade-border flex items-center justify-between">
                  <span className="pixel-text font-heading text-arcade-magenta text-[8px]">TV PREVIEW</span>
                  <a
                    href={`/display/party/${partyId}`}
                    target="_blank"
                    className="pixel-text font-heading text-arcade-cyan text-[8px] hover:text-arcade-blue"
                  >
                    OPEN FULL ↗
                  </a>
                </div>
                <div className="p-2">
                  <iframe
                    src={`/display/party/${partyId}`}
                    className="w-full border-2 border-arcade-border"
                    style={{ height: 220, pointerEvents: "none" }}
                    title="TV Preview"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Match card for admin panel ──
function DemoMatchCard({
  match,
  pName,
  simulate,
}: {
  match: Match;
  pName: (id: string | null) => string;
  simulate: (action: string, params: Record<string, unknown>) => Promise<unknown>;
}) {
  const statusColors: Record<string, string> = {
    pending: "border-arcade-border",
    in_progress: "border-arcade-green",
    pending_confirmation: "border-arcade-yellow",
    disputed: "border-arcade-red",
  };

  return (
    <div className={`border px-2 py-1.5 ${statusColors[match.status] || "border-arcade-border"} ${
      match.status === "in_progress" ? "bg-arcade-green/5" :
      match.status === "pending_confirmation" ? "bg-arcade-yellow/5" :
      match.status === "disputed" ? "bg-arcade-red/5" : ""
    }`}>
      <div className="flex items-center justify-between mb-1">
        <span className="pixel-text text-[8px] text-foreground">
          R{match.round} #{match.bracket_position}: {pName(match.player_a_id)} vs {pName(match.player_b_id)}
        </span>
        <span className={`pixel-text text-[7px] ${
          match.status === "in_progress" ? "text-arcade-green" :
          match.status === "pending_confirmation" ? "text-arcade-yellow" :
          match.status === "disputed" ? "text-arcade-red" :
          "text-arcade-border"
        }`}>
          {match.status === "pending" ? "PEND" : match.status === "in_progress" ? "LIVE" : match.status === "pending_confirmation" ? "CONF?" : "DISP"}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {match.status === "pending" && match.player_a_id && match.player_b_id && (
          <>
            <button onClick={() => simulate("ready", { match_id: match.id, player_id: match.player_a_id })}
              className="px-1.5 py-0.5 text-[7px] pixel-text border border-arcade-cyan text-arcade-cyan hover:bg-arcade-cyan/20"
              disabled={!!match.ready_a_id}>
              {match.ready_a_id ? "A ✓" : "READY A"}
            </button>
            <button onClick={() => simulate("ready", { match_id: match.id, player_id: match.player_b_id })}
              className="px-1.5 py-0.5 text-[7px] pixel-text border border-arcade-cyan text-arcade-cyan hover:bg-arcade-cyan/20"
              disabled={!!match.ready_b_id}>
              {match.ready_b_id ? "B ✓" : "READY B"}
            </button>
            <button onClick={() => simulate("call", { match_id: match.id })}
              className="px-1.5 py-0.5 text-[7px] pixel-text border border-arcade-green text-arcade-green hover:bg-arcade-green/20">
              FORCE
            </button>
          </>
        )}
        {match.status !== "completed" && match.player_a_id && match.player_b_id && (
          <>
            <button onClick={() => simulate("resolve", { match_id: match.id, winner_id: match.player_a_id })}
              className="px-1.5 py-0.5 text-[7px] pixel-text border border-arcade-blue text-arcade-blue hover:bg-arcade-blue/20">
              A WINS
            </button>
            <button onClick={() => simulate("resolve", { match_id: match.id, winner_id: match.player_b_id })}
              className="px-1.5 py-0.5 text-[7px] pixel-text border border-arcade-magenta text-arcade-magenta hover:bg-arcade-magenta/20">
              B WINS
            </button>
          </>
        )}
      </div>
    </div>
  );
}
