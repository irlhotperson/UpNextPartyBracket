"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import imageCompression from "browser-image-compression";
import { PlayerAvatar } from "@/components/player-avatar";
import type { Player, Match, Badge, EventEntry, Event } from "@/lib/types";

interface LobbyData {
  player: Player;
  entries: (EventEntry & { events: Event })[];
  matches: (Match & { events: Event })[];
  opponents: Record<string, { display_name: string; avatar_emoji: string; avatar_photo_url?: string | null }>;
  badges: Badge[];
}

function getMatchStatus(
  match: Match & { events: Event },
  playerId: string,
  opponents: Record<string, { display_name: string; avatar_emoji: string }>
) {
  const opponentId =
    match.player_a_id === playerId ? match.player_b_id : match.player_a_id;
  const opponent = opponentId ? opponents[opponentId] : null;
  const opponentName = opponent
    ? `${opponent.avatar_emoji} ${opponent.display_name}`
    : "TBD";
  const stationLabel = match.events?.station_label || match.events?.name;

  switch (match.status) {
    case "in_progress":
      return {
        text: `YOU'RE UP AT ${stationLabel?.toUpperCase()}`,
        subtext: `vs ${opponentName}`,
        color: "text-arcade-green",
        bgColor: "border-arcade-green bg-arcade-green/10",
        showReport: true,
      };
    case "pending_confirmation":
      if (match.reported_by_id === playerId) {
        return {
          text: "RESULT REPORTED",
          subtext: `Waiting for ${opponentName} to confirm`,
          color: "text-arcade-yellow",
          bgColor: "border-arcade-yellow bg-arcade-yellow/10",
          showReport: false,
        };
      } else {
        const reporterName = match.reported_by_id
          ? opponents[match.reported_by_id]?.display_name || "Someone"
          : "Someone";
        const winnerId = match.reported_winner_id;
        const winnerName =
          winnerId === playerId
            ? "you"
            : opponents[winnerId || ""]?.display_name || "them";
        return {
          text: `${reporterName} says ${winnerName} won`,
          subtext: "Confirm or dispute",
          color: "text-arcade-yellow",
          bgColor: "border-arcade-yellow bg-arcade-yellow/10",
          showConfirm: true,
          showDispute: true,
        };
      }
    case "disputed":
      return {
        text: "DISPUTED",
        subtext: "Admin is reviewing",
        color: "text-arcade-red",
        bgColor: "border-arcade-red bg-arcade-red/10",
        showReport: false,
      };
    default:
      return {
        text: `Queued for ${stationLabel || "match"}`,
        subtext: `vs ${opponentName}`,
        color: "text-arcade-border",
        bgColor: "border-arcade-border bg-arcade-navy",
        showReport: false,
      };
  }
}

export default function LobbyPage() {
  const [data, setData] = useState<LobbyData | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/players/lobby");
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, []);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !data) return;
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 400,
        maxSizeMB: 0.1,
        fileType: "image/jpeg",
        useWebWorker: true,
      });
      const formData = new FormData();
      formData.append("photo", compressed);
      await fetch(`/api/players/${data.player.id}/photo`, {
        method: "POST",
        body: formData,
      });
      fetchData();
    } catch {
      // ignore
    }
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function reportResult(matchId: string, winnerId: string) {
    await fetch(`/api/matches/${matchId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner_id: winnerId }),
    });
    setReporting(null);
    fetchData();
  }

  async function confirmResult(matchId: string) {
    await fetch(`/api/matches/${matchId}/confirm`, {
      method: "POST",
    });
    fetchData();
  }

  async function disputeResult(matchId: string) {
    await fetch(`/api/matches/${matchId}/dispute`, {
      method: "POST",
    });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-arcade-dark">
        <p className="pixel-text font-heading text-arcade-border text-xs arcade-flash">
          LOADING...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-arcade-dark px-4">
        <p className="pixel-text font-heading text-arcade-red text-xs mb-4">
          NO SESSION FOUND
        </p>
        <p className="pixel-text font-sans text-arcade-border text-lg">
          Scan the QR code to join a party
        </p>
      </div>
    );
  }

  const { player, entries, matches, opponents, badges } = data;

  return (
    <div className="flex flex-1 flex-col bg-arcade-dark px-4 py-6">
      <div className="max-w-sm mx-auto w-full">
        {/* Player header */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handlePhotoChange}
          className="hidden"
        />
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <PlayerAvatar
              emoji={player.avatar_emoji}
              photoUrl={player.avatar_photo_url}
              name={player.display_name}
              size={80}
              onClick={() => photoInputRef.current?.click()}
              className="cursor-pointer"
            />
          </div>
          <p className="pixel-text font-sans text-arcade-border text-[10px] mb-1">
            tap photo to change
          </p>
          <h1
            className="pixel-text font-heading text-arcade-yellow text-sm"
            style={{ textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000" }}
          >
            {player.display_name}
          </h1>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex justify-center gap-2 mt-2">
              {badges.map((badge) => (
                <span
                  key={badge.id}
                  className="pixel-text font-heading text-[10px] px-2 py-0.5 border"
                  style={{
                    borderColor:
                      badge.badge_type === "boss_slayer"
                        ? "#e02020"
                        : badge.badge_type === "event_champion"
                        ? "#ffd700"
                        : "#ff2d9b",
                    color:
                      badge.badge_type === "boss_slayer"
                        ? "#e02020"
                        : badge.badge_type === "event_champion"
                        ? "#ffd700"
                        : "#ff2d9b",
                  }}
                >
                  {badge.badge_type === "boss_slayer"
                    ? "BOSS SLAYER"
                    : badge.badge_type === "event_champion"
                    ? "CHAMPION"
                    : "MVP"}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Active matches */}
        {matches.length > 0 && (
          <div className="mb-6">
            <h2 className="pixel-text font-heading text-arcade-blue text-xs mb-3">
              YOUR MATCHES
            </h2>
            <div className="flex flex-col gap-2">
              {matches.map((match) => {
                const status = getMatchStatus(match, player.id, opponents);
                return (
                  <div
                    key={match.id}
                    className={`border-2 p-3 ${status.bgColor}`}
                  >
                    <p className={`pixel-text font-heading text-xs ${status.color}`}>
                      {status.text}
                    </p>
                    <p className="pixel-text font-sans text-sm text-foreground mt-1">
                      {status.subtext}
                    </p>

                    {/* Report result buttons */}
                    {status.showReport && reporting !== match.id && (
                      <button
                        onClick={() => setReporting(match.id)}
                        className="mt-2 border border-arcade-yellow bg-arcade-yellow/20 px-3 py-1.5 font-heading text-[10px] text-arcade-yellow hover:bg-arcade-yellow/40 pixel-text"
                      >
                        REPORT RESULT
                      </button>
                    )}

                    {/* Winner selection */}
                    {reporting === match.id && (
                      <div className="mt-2 flex flex-col gap-2">
                        <p className="pixel-text font-heading text-[10px] text-arcade-cyan">
                          WHO WON?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => reportResult(match.id, player.id)}
                            className="flex-1 border border-arcade-green bg-arcade-green/20 px-2 py-2 font-heading text-[10px] text-arcade-green hover:bg-arcade-green/40 pixel-text"
                          >
                            I WON
                          </button>
                          <button
                            onClick={() => {
                              const opId =
                                match.player_a_id === player.id
                                  ? match.player_b_id
                                  : match.player_a_id;
                              if (opId) reportResult(match.id, opId);
                            }}
                            className="flex-1 border border-arcade-red bg-arcade-red/20 px-2 py-2 font-heading text-[10px] text-arcade-red hover:bg-arcade-red/40 pixel-text"
                          >
                            THEY WON
                          </button>
                        </div>
                        <button
                          onClick={() => setReporting(null)}
                          className="pixel-text font-heading text-[10px] text-arcade-border hover:text-foreground"
                        >
                          CANCEL
                        </button>
                      </div>
                    )}

                    {/* Confirm / Dispute */}
                    {"showConfirm" in status && status.showConfirm && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => confirmResult(match.id)}
                          className="flex-1 border border-arcade-green bg-arcade-green/20 px-2 py-2 font-heading text-[10px] text-arcade-green hover:bg-arcade-green/40 pixel-text"
                        >
                          CONFIRM
                        </button>
                        <button
                          onClick={() => disputeResult(match.id)}
                          className="flex-1 border border-arcade-red bg-arcade-red/20 px-2 py-2 font-heading text-[10px] text-arcade-red hover:bg-arcade-red/40 pixel-text"
                        >
                          DISPUTE
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Event status */}
        <div>
          <h2 className="pixel-text font-heading text-arcade-blue text-xs mb-3">
            YOUR EVENTS
          </h2>
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="border-2 border-arcade-border bg-arcade-navy p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="pixel-text font-heading text-xs text-foreground">
                      {entry.events?.name}
                    </p>
                    {entry.events?.station_label && (
                      <p className="pixel-text font-sans text-arcade-border text-sm">
                        @ {entry.events.station_label}
                      </p>
                    )}
                  </div>
                  <span
                    className={`pixel-text font-heading text-[10px] ${
                      entry.eliminated
                        ? "text-arcade-red"
                        : entry.qualified
                        ? "text-arcade-green"
                        : entry.events?.status === "active"
                        ? "text-arcade-yellow"
                        : entry.events?.status === "completed"
                        ? "text-arcade-magenta"
                        : "text-arcade-border"
                    }`}
                  >
                    {entry.eliminated
                      ? "ELIMINATED"
                      : entry.qualified
                      ? "QUALIFIED"
                      : entry.events?.status === "active"
                      ? "IN PROGRESS"
                      : entry.events?.status === "completed"
                      ? "FINISHED"
                      : "WAITING"}
                  </span>
                </div>
              </div>
            ))}

            {entries.length === 0 && (
              <p className="pixel-text font-sans text-arcade-border text-center text-lg py-4">
                Not entered in any events yet.
              </p>
            )}
          </div>
        </div>

        {/* Refresh hint */}
        <p className="pixel-text font-sans text-arcade-border text-center text-sm mt-8">
          Pull down to refresh your status
        </p>
      </div>
    </div>
  );
}
