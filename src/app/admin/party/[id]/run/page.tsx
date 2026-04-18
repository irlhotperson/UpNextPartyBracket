"use client";

import { useState, useEffect, useCallback, use } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Event, Match, Player } from "@/lib/types";

interface StationData {
  event: Event;
  matches: Match[];
  players: Record<string, { display_name: string; avatar_emoji: string }>;
}

export default function AdminRunDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: partyId } = use(params);
  const [stations, setStations] = useState<StationData[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [busyPlayers, setBusyPlayers] = useState<
    Map<string, string>
  >(new Map());

  const fetchData = useCallback(async () => {
    const eventsRes = await fetch(`/api/events?party_id=${partyId}`);
    if (!eventsRes.ok) return;
    const events: Event[] = await eventsRes.json();

    const stationData: StationData[] = [];
    const busy = new Map<string, string>();

    for (const event of events) {
      const bracketRes = await fetch(`/api/events/${event.id}/bracket`);
      if (bracketRes.ok) {
        const { matches, players } = await bracketRes.json();
        stationData.push({
          event,
          matches: matches || [],
          players: players || {},
        });

        // Track busy players (in active matches)
        matches?.forEach((m: Match) => {
          if (m.status === "in_progress") {
            if (m.player_a_id)
              busy.set(
                m.player_a_id,
                event.station_label || event.name
              );
            if (m.player_b_id)
              busy.set(
                m.player_b_id,
                event.station_label || event.name
              );
          }
        });
      } else {
        stationData.push({ event, matches: [], players: {} });
      }
    }

    setStations(stationData);
    setBusyPlayers(busy);

    // Fetch all players
    const playersRes = await fetch(
      `/api/events/${events[0]?.id}/entries`
    );
    if (playersRes.ok) {
      const entries = await playersRes.json();
      setAllPlayers(
        entries.map((e: { players: Player }) => e.players).filter(Boolean)
      );
    }
  }, [partyId]);

  useEffect(() => {
    fetchData();

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("admin-run")
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
      .subscribe();

    const interval = setInterval(fetchData, 8000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchData]);

  async function callMatch(matchId: string) {
    await fetch(`/api/matches/${matchId}/call`, { method: "POST" });
    fetchData();
  }

  async function resolveMatch(matchId: string, winnerId: string) {
    await fetch(`/api/matches/${matchId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner_id: winnerId }),
    });
    fetchData();
  }

  async function startEvent(eventId: string, format: string) {
    let url = "";
    if (format === "single_elim") url = `/api/events/${eventId}/bracket`;
    else if (format === "boss_mode") url = `/api/events/${eventId}/boss`;
    else if (format === "hot_streak")
      url = `/api/events/${eventId}/hotstreak`;
    else if (format === "best_score")
      url = `/api/events/${eventId}/bestscore`;

    if (url) {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      fetchData();
    }
  }

  function isPlayerBusy(playerId: string): string | null {
    return busyPlayers.get(playerId) || null;
  }

  function MatchCard({
    match,
    players,
    stationLabel,
  }: {
    match: Match;
    players: Record<string, { display_name: string; avatar_emoji: string }>;
    stationLabel: string;
  }) {
    const pA = match.player_a_id ? players[match.player_a_id] : null;
    const pB = match.player_b_id ? players[match.player_b_id] : null;
    const busyA = match.player_a_id ? isPlayerBusy(match.player_a_id) : null;
    const busyB = match.player_b_id ? isPlayerBusy(match.player_b_id) : null;
    const eitherBusy =
      (busyA && busyA !== stationLabel) ||
      (busyB && busyB !== stationLabel);

    const statusColors: Record<string, string> = {
      pending: "border-arcade-border",
      in_progress: "border-arcade-green",
      pending_confirmation: "border-arcade-yellow",
      disputed: "border-arcade-red",
      completed: "border-arcade-border opacity-50",
    };

    return (
      <div
        className={`border-2 p-2 mb-2 ${
          statusColors[match.status] || "border-arcade-border"
        } ${
          match.status === "pending_confirmation"
            ? "bg-arcade-yellow/10"
            : match.status === "disputed"
            ? "bg-arcade-red/10"
            : match.status === "in_progress"
            ? "bg-arcade-green/5"
            : "bg-arcade-navy"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className={`pixel-text font-heading text-[8px] ${
              match.status === "in_progress"
                ? "text-arcade-green"
                : match.status === "pending_confirmation"
                ? "text-arcade-yellow"
                : match.status === "disputed"
                ? "text-arcade-red"
                : "text-arcade-border"
            }`}
          >
            {match.status === "in_progress"
              ? "NOW PLAYING"
              : match.status === "pending_confirmation"
              ? "PENDING CONFIRM"
              : match.status === "disputed"
              ? "DISPUTED"
              : match.status === "completed"
              ? "COMPLETED"
              : "PENDING"}
          </span>
          {match.status === "in_progress" && match.called_at && (
            <TimeSince time={match.called_at} />
          )}
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="pixel-text font-heading text-[10px] text-foreground">
            {pA ? `${pA.avatar_emoji} ${pA.display_name}` : "TBD"}
            {match.status === "pending" && match.ready_a_id && (
              <span className="text-arcade-green text-[8px] ml-1">READY</span>
            )}
            {busyA && busyA !== stationLabel && (
              <span className="text-arcade-orange ml-1">(@ {busyA})</span>
            )}
          </span>
          <span className="pixel-text font-heading text-arcade-red text-[8px] mx-1">
            VS
          </span>
          <span className="pixel-text font-heading text-[10px] text-foreground">
            {pB ? `${pB.avatar_emoji} ${pB.display_name}` : "TBD"}
            {match.status === "pending" && match.ready_b_id && (
              <span className="text-arcade-green text-[8px] ml-1">READY</span>
            )}
            {busyB && busyB !== stationLabel && (
              <span className="text-arcade-orange ml-1">(@ {busyB})</span>
            )}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-1 mt-2">
          {match.status === "pending" &&
            match.player_a_id &&
            match.player_b_id && (
              <button
                onClick={() => callMatch(match.id)}
                disabled={!!eitherBusy}
                className={`px-2 py-1 font-heading text-[8px] pixel-text border ${
                  eitherBusy
                    ? "border-arcade-border text-arcade-border cursor-not-allowed"
                    : "border-arcade-green text-arcade-green bg-arcade-green/10 hover:bg-arcade-green/30"
                }`}
                title={eitherBusy ? "Player busy at another station" : ""}
              >
                CALL MATCH
              </button>
            )}

          {(match.status === "in_progress" ||
            match.status === "pending_confirmation" ||
            match.status === "disputed") && (
            <>
              {match.player_a_id && (
                <button
                  onClick={() =>
                    resolveMatch(match.id, match.player_a_id!)
                  }
                  className="px-2 py-1 font-heading text-[8px] pixel-text border border-arcade-blue text-arcade-blue bg-arcade-blue/10 hover:bg-arcade-blue/30"
                >
                  {pA?.display_name} WINS
                </button>
              )}
              {match.player_b_id && (
                <button
                  onClick={() =>
                    resolveMatch(match.id, match.player_b_id!)
                  }
                  className="px-2 py-1 font-heading text-[8px] pixel-text border border-arcade-magenta text-arcade-magenta bg-arcade-magenta/10 hover:bg-arcade-magenta/30"
                >
                  {pB?.display_name} WINS
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arcade-dark">
      {/* Header */}
      <div className="border-b-2 border-arcade-border px-4 py-3 flex items-center justify-between">
        <h1
          className="pixel-text font-heading text-arcade-yellow text-xs"
          style={{
            textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000",
          }}
        >
          CONTROL CENTER
        </h1>
        <div className="flex gap-2">
          <a
            href={`/admin/party/${partyId}`}
            className="pixel-text font-heading text-arcade-cyan text-[10px] hover:text-arcade-blue"
          >
            ← PARTY
          </a>
          <a
            href={`/display/party/${partyId}`}
            target="_blank"
            className="pixel-text font-heading text-arcade-magenta text-[10px] hover:text-pink-400"
          >
            TV ↗
          </a>
        </div>
      </div>

      {/* Station columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {stations.map((station) => {
          const nowPlaying = station.matches.filter(
            (m) => m.status === "in_progress"
          );
          const pendingConfirm = station.matches.filter(
            (m) => m.status === "pending_confirmation"
          );
          const disputed = station.matches.filter(
            (m) => m.status === "disputed"
          );
          const pending = station.matches.filter(
            (m) =>
              m.status === "pending" && m.player_a_id && m.player_b_id
          );

          return (
            <div
              key={station.event.id}
              className="border-2 border-arcade-border bg-arcade-dark"
            >
              {/* Station header */}
              <div className="border-b-2 border-arcade-border px-3 py-2 flex items-center justify-between">
                <div>
                  <h2 className="pixel-text font-heading text-foreground text-[10px]">
                    {station.event.name}
                  </h2>
                  <p className="pixel-text font-sans text-arcade-border text-xs">
                    {station.event.station_label}
                  </p>
                </div>
                <span
                  className={`pixel-text font-heading text-[8px] ${
                    station.event.status === "active"
                      ? "text-arcade-green"
                      : station.event.status === "completed"
                      ? "text-arcade-magenta"
                      : "text-arcade-border"
                  }`}
                >
                  {station.event.status.toUpperCase()}
                </span>
              </div>

              <div className="p-3 max-h-[70vh] overflow-y-auto">
                {/* Start button for setup events */}
                {station.event.status === "setup" && (
                  <button
                    onClick={() =>
                      startEvent(station.event.id, station.event.format)
                    }
                    className="w-full mb-3 border-2 border-arcade-green bg-arcade-green/20 px-3 py-2 font-heading text-[10px] text-arcade-green hover:bg-arcade-green/40 pixel-text"
                  >
                    START EVENT
                  </button>
                )}

                {/* Now Playing */}
                {nowPlaying.length > 0 && (
                  <div className="mb-3">
                    <p className="pixel-text font-heading text-arcade-green text-[8px] mb-1">
                      NOW PLAYING
                    </p>
                    {nowPlaying.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        players={station.players}
                        stationLabel={
                          station.event.station_label || station.event.name
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Pending Confirmation */}
                {pendingConfirm.length > 0 && (
                  <div className="mb-3">
                    <p className="pixel-text font-heading text-arcade-yellow text-[8px] mb-1">
                      PENDING CONFIRMATION
                    </p>
                    {pendingConfirm.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        players={station.players}
                        stationLabel={
                          station.event.station_label || station.event.name
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Disputed */}
                {disputed.length > 0 && (
                  <div className="mb-3">
                    <p className="pixel-text font-heading text-arcade-red text-[8px] mb-1 arcade-flash">
                      DISPUTED
                    </p>
                    {disputed.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        players={station.players}
                        stationLabel={
                          station.event.station_label || station.event.name
                        }
                      />
                    ))}
                  </div>
                )}

                {/* On Deck / Pending */}
                {pending.length > 0 && (
                  <div className="mb-3">
                    <p className="pixel-text font-heading text-arcade-border text-[8px] mb-1">
                      ON DECK ({pending.length})
                    </p>
                    {pending.slice(0, 3).map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        players={station.players}
                        stationLabel={
                          station.event.station_label || station.event.name
                        }
                      />
                    ))}
                    {pending.length > 3 && (
                      <p className="pixel-text font-sans text-arcade-border text-xs text-center">
                        +{pending.length - 3} more
                      </p>
                    )}
                  </div>
                )}

                {station.matches.length === 0 &&
                  station.event.status === "active" && (
                    <p className="pixel-text font-sans text-arcade-border text-xs text-center py-4">
                      No matches yet
                    </p>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Busy players indicator */}
      {busyPlayers.size > 0 && (
        <div className="border-t-2 border-arcade-border px-4 py-2">
          <p className="pixel-text font-heading text-arcade-border text-[8px] mb-1">
            ACTIVE PLAYERS
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from(busyPlayers.entries()).map(([playerId, station]) => {
              const player = stations
                .flatMap((s) =>
                  Object.entries(s.players).map(([id, p]) => ({
                    id,
                    ...p,
                  }))
                )
                .find((p) => p.id === playerId);
              return (
                <span
                  key={playerId}
                  className="pixel-text font-heading text-[8px] text-arcade-green border border-arcade-green/30 px-2 py-0.5"
                >
                  {player?.avatar_emoji} {player?.display_name} @ {station}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TimeSince({ time }: { time: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    function update() {
      const diff = Math.floor(
        (Date.now() - new Date(time).getTime()) / 1000
      );
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setElapsed(`${mins}:${secs.toString().padStart(2, "0")}`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [time]);

  return (
    <span className="pixel-text font-heading text-arcade-yellow text-[8px]">
      {elapsed}
    </span>
  );
}
