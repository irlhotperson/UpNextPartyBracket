"use client";

import { useEffect, useState } from "react";

interface CeremonyPlayer {
  display_name: string;
  avatar_emoji: string;
}

interface CeremonyProps {
  champions: { event_name: string; player: CeremonyPlayer }[];
  slayers: CeremonyPlayer[];
  mvp: CeremonyPlayer | null;
  mvpPoints: number;
  onDismiss: () => void;
}

export function CeremonyScreen({
  champions,
  slayers,
  mvp,
  mvpPoints,
  onDismiss,
}: CeremonyProps) {
  const [phase, setPhase] = useState(0);
  // Phase 0: champions, Phase 1: slayers, Phase 2: MVP

  const totalPhases = 2 + (slayers.length > 0 ? 1 : 0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    let t = 5000;

    if (slayers.length > 0) {
      timers.push(setTimeout(() => setPhase(1), t));
      t += 4000;
      timers.push(setTimeout(() => setPhase(2), t));
      t += 6000;
    } else {
      timers.push(setTimeout(() => setPhase(2), t));
      t += 6000;
    }

    timers.push(setTimeout(onDismiss, t));
    return () => timers.forEach(clearTimeout);
  }, [onDismiss, slayers.length]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-arcade-dark overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(255,215,0,0.15) 0%, rgba(6,8,16,0) 70%)",
        }}
      />

      {/* Phase 0: Event Champions */}
      {phase === 0 && (
        <div className="relative z-10 text-center px-4">
          <h1
            className="pixel-text font-heading text-arcade-yellow text-base mb-6 arcade-flash"
            style={{
              textShadow:
                "0 0 20px rgba(255,215,0,0.6), 3px 3px 0 #000",
            }}
          >
            EVENT CHAMPIONS
          </h1>
          <div className="flex flex-wrap justify-center gap-6">
            {champions.map((c, i) => (
              <div key={i} className="text-center slide-in-left">
                <p className="text-6xl mb-2">{c.player.avatar_emoji}</p>
                <p className="pixel-text font-heading text-arcade-yellow text-xs">
                  {c.player.display_name}
                </p>
                <p className="pixel-text font-sans text-arcade-cyan text-sm mt-1">
                  {c.event_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 1: Boss Slayers */}
      {phase === 1 && slayers.length > 0 && (
        <div className="relative z-10 text-center px-4">
          <h1
            className="pixel-text font-heading text-arcade-red text-base mb-6 arcade-flash"
            style={{
              textShadow:
                "0 0 20px rgba(224,32,32,0.6), 3px 3px 0 #000",
            }}
          >
            BOSS SLAYERS
          </h1>
          <div className="flex flex-wrap justify-center gap-4">
            {slayers.map((s, i) => (
              <div key={i} className="text-center slide-in-right">
                <p className="text-5xl mb-1">{s.avatar_emoji}</p>
                <p className="pixel-text font-heading text-arcade-red text-[10px]">
                  {s.display_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase 2: MVP */}
      {phase === 2 && mvp && (
        <div className="relative z-10 text-center screen-shake">
          <h1
            className="pixel-text font-heading text-arcade-magenta text-lg mb-4 arcade-flash"
            style={{
              textShadow:
                "0 0 30px rgba(255,45,155,0.8), 0 0 60px rgba(255,45,155,0.4), 4px 4px 0 #000",
            }}
          >
            PARTY MVP
          </h1>
          <p
            className="text-9xl mb-4"
            style={{
              filter: "drop-shadow(0 0 40px rgba(255,45,155,0.6))",
            }}
          >
            {mvp.avatar_emoji}
          </p>
          <p
            className="pixel-text font-heading text-arcade-yellow text-sm"
            style={{
              textShadow:
                "0 0 20px rgba(255,215,0,0.6), 3px 3px 0 #000",
            }}
          >
            {mvp.display_name}
          </p>
          <p className="pixel-text font-sans text-arcade-cyan text-xl mt-2">
            {mvpPoints} POINTS
          </p>
        </div>
      )}

      <div className="scanlines" />
    </div>
  );
}
