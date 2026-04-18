"use client";

import type { Match } from "@/lib/types";

interface BracketViewProps {
  matches: Match[];
  players: Record<string, { display_name: string; avatar_emoji: string }>;
  compact?: boolean;
}

function PlayerSlot({
  playerId,
  players,
  isWinner,
  compact,
}: {
  playerId: string | null;
  players: Record<string, { display_name: string; avatar_emoji: string }>;
  isWinner: boolean;
  compact?: boolean;
}) {
  const player = playerId ? players[playerId] : null;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 border border-arcade-border ${
        compact ? "py-0.5" : "py-1"
      } ${
        isWinner
          ? "bg-arcade-green/20 border-arcade-green"
          : player
          ? "bg-arcade-navy"
          : "bg-arcade-dark"
      }`}
    >
      {player ? (
        <>
          <span className={compact ? "text-sm" : "text-base"}>
            {player.avatar_emoji}
          </span>
          <span
            className={`pixel-text font-heading truncate ${
              compact ? "text-[8px]" : "text-[10px]"
            } ${isWinner ? "text-arcade-green" : "text-foreground"}`}
          >
            {player.display_name}
          </span>
        </>
      ) : (
        <span
          className={`pixel-text font-heading text-arcade-border ${
            compact ? "text-[8px]" : "text-[10px]"
          }`}
        >
          ---
        </span>
      )}
    </div>
  );
}

export function BracketView({ matches, players, compact }: BracketViewProps) {
  if (matches.length === 0) {
    return (
      <p className="pixel-text font-sans text-arcade-border text-center text-sm py-4">
        No bracket generated yet
      </p>
    );
  }

  // Group matches by round
  const rounds = new Map<number, Match[]>();
  matches.forEach((m) => {
    const arr = rounds.get(m.round) || [];
    arr.push(m);
    rounds.set(m.round, arr);
  });

  const roundNumbers = Array.from(rounds.keys()).sort((a, b) => a - b);
  const maxRound = Math.max(...roundNumbers);

  return (
    <div className="flex gap-4 overflow-x-auto py-2">
      {roundNumbers.map((roundNum) => {
        const roundMatches = rounds.get(roundNum)!;
        const roundLabel =
          roundNum === maxRound
            ? "FINALS"
            : roundNum === maxRound - 1
            ? "SEMIS"
            : `ROUND ${roundNum}`;

        return (
          <div key={roundNum} className="flex flex-col gap-2 min-w-[140px]">
            <p
              className={`pixel-text font-heading text-arcade-cyan text-center ${
                compact ? "text-[8px]" : "text-[10px]"
              }`}
            >
              {roundLabel}
            </p>
            <div
              className="flex flex-col justify-around flex-1"
              style={{ gap: `${Math.pow(2, roundNum - 1) * 8}px` }}
            >
              {roundMatches.map((match) => {
                const isActive = match.status === "in_progress";
                const isPending = match.status === "pending_confirmation";

                return (
                  <div
                    key={match.id}
                    className={`border-2 rounded ${
                      isActive
                        ? "border-arcade-green health-pulse"
                        : isPending
                        ? "border-arcade-yellow"
                        : match.status === "disputed"
                        ? "border-arcade-red"
                        : "border-arcade-border"
                    }`}
                    style={{
                      boxShadow: isActive
                        ? "0 0 10px rgba(57,255,20,0.3)"
                        : "none",
                    }}
                  >
                    <PlayerSlot
                      playerId={match.player_a_id}
                      players={players}
                      isWinner={match.winner_id === match.player_a_id}
                      compact={compact}
                    />
                    <div className="border-t border-arcade-border" />
                    <PlayerSlot
                      playerId={match.player_b_id}
                      players={players}
                      isWinner={match.winner_id === match.player_b_id}
                      compact={compact}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
