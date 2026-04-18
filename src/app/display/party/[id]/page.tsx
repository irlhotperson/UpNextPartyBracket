"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { VSScreen } from "@/components/vs-screen";
import { KOScreen } from "@/components/ko-screen";
import { BracketView } from "@/components/bracket-view";
import { Watermark } from "@/components/watermark";
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

            {/* Bracket view for single_elim */}
            {ed.event.format === "single_elim" && (
              <BracketView
                matches={ed.matches}
                players={ed.players}
                compact
              />
            )}

            {/* Boss Mode stats */}
            {ed.event.format === "boss_mode" && (
              <BossModeDisplay
                matches={ed.matches}
                players={ed.players}
                config={ed.event.format_config as { boss_player_id: string; win_threshold_pct: number }}
              />
            )}

            {/* Hot Streak display */}
            {ed.event.format === "hot_streak" && (
              <HotStreakDisplay
                matches={ed.matches}
                players={ed.players}
                entries={ed.entries}
                config={ed.event.format_config as { round1_streak_target: number; max_qualifiers: number }}
              />
            )}

            {/* Best Score leaderboard */}
            {ed.event.format === "best_score" && (
              <BestScoreDisplay
                matches={ed.matches}
                players={ed.players}
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

      {/* Watermark — hidden during takeovers */}
      {!takeover && <Watermark position="bottom-right" size={65} opacity={0.25} />}

      {/* Scanlines */}
      <div className="scanlines" />
    </div>
  );
}

function BossModeDisplay({
  matches,
  players,
  config,
}: {
  matches: Match[];
  players: Record<string, { display_name: string; avatar_emoji: string }>;
  config: { boss_player_id: string; win_threshold_pct: number };
}) {
  const completed = matches.filter((m) => m.status === "completed");
  const bossWins = completed.filter((m) => m.winner_id === config.boss_player_id).length;
  const bossLosses = completed.length - bossWins;
  const total = matches.length;
  const winsNeeded = Math.ceil(total * (config.win_threshold_pct / 100));
  const boss = players[config.boss_player_id];

  // Slayers
  const slayerIds = completed
    .filter((m) => m.winner_id && m.winner_id !== config.boss_player_id)
    .map((m) => m.winner_id!);

  return (
    <div className="space-y-2">
      {/* Boss W-L counter */}
      <div className="border-2 border-arcade-red bg-arcade-red/10 p-2 text-center">
        <p className="text-2xl mb-1">{boss?.avatar_emoji || "👑"}</p>
        <p className="pixel-text font-heading text-arcade-red text-[10px]">
          {boss?.display_name || "BOSS"}
        </p>
        <p className="pixel-text font-heading text-foreground text-sm mt-1">
          {bossWins}W - {bossLosses}L
        </p>
        <p className="pixel-text font-sans text-arcade-border text-xs mt-1">
          {winsNeeded - bossWins > 0
            ? `NEEDS ${winsNeeded - bossWins} MORE WIN${winsNeeded - bossWins !== 1 ? "S" : ""}`
            : "THRESHOLD MET"}
        </p>
        {/* Health bar */}
        <div className="mt-2 h-2 bg-arcade-dark border border-arcade-border">
          <div
            className="h-full bg-arcade-red transition-all"
            style={{
              width: `${total > 0 ? (completed.length / total) * 100 : 0}%`,
            }}
          />
        </div>
        <p className="pixel-text font-sans text-arcade-border text-[10px] mt-1">
          {completed.length}/{total} MATCHES
        </p>
      </div>

      {/* Slayers */}
      {slayerIds.length > 0 && (
        <div className="border border-arcade-red/50 p-2">
          <p className="pixel-text font-heading text-arcade-red text-[8px] mb-1">
            BOSS SLAYERS
          </p>
          <div className="flex flex-wrap gap-1">
            {slayerIds.map((id, i) => {
              const p = players[id];
              return (
                <span key={`${id}-${i}`} className="text-sm">
                  {p?.avatar_emoji} <span className="pixel-text font-heading text-[8px] text-foreground">{p?.display_name}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HotStreakDisplay({
  matches,
  players,
  entries,
  config,
}: {
  matches: Match[];
  players: Record<string, { display_name: string; avatar_emoji: string }>;
  entries: { player_id: string; eliminated: boolean; qualified: boolean }[];
  config: { round1_streak_target: number; max_qualifiers: number };
}) {
  const round1 = matches.filter((m) => m.round <= 100);
  const completedR1 = round1
    .filter((m) => m.status === "completed")
    .sort((a, b) => new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime());

  // Current streak
  let streak = 0;
  let throneHolder: string | null = null;
  if (completedR1.length > 0) {
    throneHolder = completedR1[0].winner_id;
    for (const m of completedR1) {
      if (m.winner_id === throneHolder) streak++;
      else break;
    }
  }

  const qualifiers = entries.filter((e) => e.qualified);

  return (
    <div className="space-y-2">
      {/* Streak counter */}
      {throneHolder && players[throneHolder] && (
        <div
          className="border-2 p-2 text-center"
          style={{
            borderColor: streak >= config.round1_streak_target ? "#39ff14" : `hsl(${30 + streak * 15}, 100%, 50%)`,
            background: `rgba(255, ${Math.max(0, 106 - streak * 30)}, 0, ${0.1 + streak * 0.05})`,
          }}
        >
          <p className="text-2xl">{players[throneHolder].avatar_emoji}</p>
          <p className="pixel-text font-heading text-foreground text-[10px]">
            {players[throneHolder].display_name}
          </p>
          <p
            className="pixel-text font-heading text-sm mt-1"
            style={{ color: `hsl(${30 + streak * 15}, 100%, 50%)` }}
          >
            🔥 STREAK: {streak} / {config.round1_streak_target}
          </p>
        </div>
      )}

      {/* Qualifiers board */}
      <div className="border border-arcade-orange/50 p-2">
        <p className="pixel-text font-heading text-arcade-orange text-[8px] mb-1">
          QUALIFIERS ({qualifiers.length}/{config.max_qualifiers})
        </p>
        {qualifiers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {qualifiers.map((q) => {
              const p = players[q.player_id];
              return (
                <span key={q.player_id} className="pixel-text font-heading text-[8px] text-arcade-green border border-arcade-green/30 px-1.5 py-0.5">
                  {p?.avatar_emoji} {p?.display_name}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="pixel-text font-sans text-arcade-border text-xs">
            No qualifiers yet
          </p>
        )}
      </div>
    </div>
  );
}

function BestScoreDisplay({
  matches,
  players,
}: {
  matches: Match[];
  players: Record<string, { display_name: string; avatar_emoji: string }>;
}) {
  // Build leaderboard
  const bestScores = new Map<string, number>();
  matches
    .filter((m) => m.status === "completed" && m.player_a_id && m.score_a !== null)
    .forEach((m) => {
      const current = bestScores.get(m.player_a_id!);
      if (current === undefined || (m.score_a !== null && m.score_a > current)) {
        bestScores.set(m.player_a_id!, m.score_a!);
      }
    });

  const leaderboard = Array.from(bestScores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="border border-arcade-green/50 p-2">
      <p className="pixel-text font-heading text-arcade-green text-[8px] mb-2">
        LEADERBOARD
      </p>
      {leaderboard.length > 0 ? (
        <div className="space-y-1">
          {leaderboard.map((entry, i) => {
            const p = players[entry.id];
            return (
              <div key={entry.id} className="flex items-center justify-between">
                <span className="pixel-text font-heading text-[10px] text-foreground">
                  {i === 0 ? "👑" : `${i + 1}.`} {p?.avatar_emoji} {p?.display_name}
                </span>
                <span className="pixel-text font-heading text-arcade-yellow text-[10px]">
                  {entry.score}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="pixel-text font-sans text-arcade-border text-xs">
          No scores yet
        </p>
      )}
    </div>
  );
}
