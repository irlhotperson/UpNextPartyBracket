"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { VSScreen } from "@/components/vs-screen";
import { KOScreen } from "@/components/ko-screen";
import { BracketView } from "@/components/bracket-view";
import type { Event, Match, Player } from "@/lib/types";

interface EventData {
  event: Event;
  matches: Match[];
  players: Record<string, { display_name: string; avatar_emoji: string }>;
  entries: { player_id: string; eliminated: boolean; qualified: boolean }[];
}

type Takeover =
  | { type: "vs"; playerA: Player; playerB: Player; station: string }
  | {
      type: "ko" | "boss_defeated" | "qualified";
      winner: { display_name: string; avatar_emoji: string };
    }
  | null;

export default function PartyDisplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: partyId } = use(params);
  const [partyName, setPartyName] = useState("");
  const [eventData, setEventData] = useState<EventData[]>([]);
  const [takeover, setTakeover] = useState<Takeover>(null);
  const prevMatchStates = useRef<Map<string, string>>(new Map());

  const fetchData = useCallback(async () => {
    // Fetch party
    const partyRes = await fetch(`/api/parties/${partyId}`);
    if (partyRes.ok) {
      const party = await partyRes.json();
      setPartyName(party.name);
    }

    // Fetch events
    const eventsRes = await fetch(`/api/events?party_id=${partyId}`);
    if (!eventsRes.ok) return;
    const events: Event[] = await eventsRes.json();

    // Fetch bracket data for each event
    const data: EventData[] = [];
    for (const event of events) {
      const bracketRes = await fetch(`/api/events/${event.id}/bracket`);
      if (bracketRes.ok) {
        const { matches, players } = await bracketRes.json();
        // Fetch entries
        const entriesRes = await fetch(
          `/api/events/${event.id}/entries`
        );
        const entries = entriesRes.ok ? await entriesRes.json() : [];
        data.push({ event, matches: matches || [], players: players || {}, entries });
      } else {
        data.push({ event, matches: [], players: {}, entries: [] });
      }
    }

    // Detect state changes for takeovers
    for (const ed of data) {
      for (const match of ed.matches) {
        const prevStatus = prevMatchStates.current.get(match.id);

        // VS takeover: match was called (pending → in_progress)
        if (prevStatus === "pending" && match.status === "in_progress") {
          const playerA = match.player_a_id
            ? ed.players[match.player_a_id]
            : null;
          const playerB = match.player_b_id
            ? ed.players[match.player_b_id]
            : null;
          if (playerA && playerB) {
            setTakeover({
              type: "vs",
              playerA: playerA as unknown as Player,
              playerB: playerB as unknown as Player,
              station: ed.event.station_label || ed.event.name,
            });
          }
        }

        // KO takeover: match completed
        if (
          prevStatus &&
          prevStatus !== "completed" &&
          match.status === "completed" &&
          match.winner_id
        ) {
          const winner = ed.players[match.winner_id];
          if (winner) {
            setTakeover({ type: "ko", winner });
          }
        }

        prevMatchStates.current.set(match.id, match.status);
      }
    }

    setEventData(data);
  }, [partyId]);

  useEffect(() => {
    fetchData();

    // Set up realtime subscription
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("party-display")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_entries" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "badges" },
        () => fetchData()
      )
      .subscribe();

    // Fallback polling
    const interval = setInterval(fetchData, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-arcade-dark relative">
      {/* Takeovers */}
      {takeover?.type === "vs" && (
        <VSScreen
          playerA={takeover.playerA}
          playerB={takeover.playerB}
          stationLabel={takeover.station}
          onDismiss={() => setTakeover(null)}
        />
      )}
      {takeover &&
        (takeover.type === "ko" ||
          takeover.type === "boss_defeated" ||
          takeover.type === "qualified") && (
          <KOScreen
            winner={takeover.winner}
            type={takeover.type}
            onDismiss={() => setTakeover(null)}
          />
        )}

      {/* Header */}
      <div className="border-b-2 border-arcade-border px-6 py-4">
        <div className="flex items-center justify-between">
          <h1
            className="pixel-text font-heading text-arcade-yellow text-sm"
            style={{
              textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000",
            }}
          >
            {partyName || "UPNEXT"}
          </h1>
          <p className="pixel-text font-heading text-arcade-cyan text-xs">
            PARTY BRACKET
          </p>
        </div>
      </div>

      {/* Events grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {eventData.map((ed) => (
          <div
            key={ed.event.id}
            className="border-2 border-arcade-border bg-arcade-navy p-4"
            style={{ boxShadow: "0 0 10px rgba(26,109,255,0.1)" }}
          >
            {/* Event header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="pixel-text font-heading text-foreground text-xs">
                  {ed.event.name}
                </h2>
                <p className="pixel-text font-sans text-arcade-border text-sm">
                  {ed.event.station_label}
                </p>
              </div>
              <span
                className={`pixel-text font-heading text-[10px] ${
                  ed.event.status === "active"
                    ? "text-arcade-green"
                    : ed.event.status === "completed"
                    ? "text-arcade-magenta"
                    : "text-arcade-border"
                }`}
              >
                {ed.event.status.toUpperCase()}
              </span>
            </div>

            {/* Now playing */}
            {ed.matches
              .filter((m) => m.status === "in_progress")
              .map((match) => {
                const pA = match.player_a_id
                  ? ed.players[match.player_a_id]
                  : null;
                const pB = match.player_b_id
                  ? ed.players[match.player_b_id]
                  : null;
                return (
                  <div
                    key={match.id}
                    className="border-2 border-arcade-green bg-arcade-green/10 p-2 mb-3 health-pulse"
                  >
                    <p className="pixel-text font-heading text-arcade-green text-[10px] mb-1">
                      NOW PLAYING
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="pixel-text font-heading text-[10px] text-foreground">
                        {pA ? `${pA.avatar_emoji} ${pA.display_name}` : "TBD"}
                      </span>
                      <span className="pixel-text font-heading text-arcade-red text-[10px]">
                        VS
                      </span>
                      <span className="pixel-text font-heading text-[10px] text-foreground">
                        {pB ? `${pB.avatar_emoji} ${pB.display_name}` : "TBD"}
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* Bracket or event-specific view */}
            {ed.event.format === "single_elim" && (
              <BracketView
                matches={ed.matches}
                players={ed.players}
                compact
              />
            )}

            {/* Winner */}
            {ed.event.overall_winner_id &&
              ed.players[ed.event.overall_winner_id] && (
                <div className="border-2 border-arcade-yellow bg-arcade-yellow/10 p-2 mt-2 text-center">
                  <p className="pixel-text font-heading text-arcade-yellow text-[10px]">
                    CHAMPION
                  </p>
                  <p className="text-2xl mt-1">
                    {ed.players[ed.event.overall_winner_id].avatar_emoji}
                  </p>
                  <p className="pixel-text font-heading text-arcade-yellow text-xs mt-1">
                    {ed.players[ed.event.overall_winner_id].display_name}
                  </p>
                </div>
              )}
          </div>
        ))}
      </div>

      {/* Scanlines */}
      <div className="scanlines" />
    </div>
  );
}
