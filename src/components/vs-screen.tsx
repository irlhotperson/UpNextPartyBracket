"use client";

import { useEffect, useState } from "react";

interface VSScreenProps {
  playerA: { display_name: string; avatar_emoji: string } | null;
  playerB: { display_name: string; avatar_emoji: string } | null;
  stationLabel: string;
  onDismiss: () => void;
}

export function VSScreen({
  playerA,
  playerB,
  stationLabel,
  onDismiss,
}: VSScreenProps) {
  const [phase, setPhase] = useState<"slide" | "vs" | "fight">("slide");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("vs"), 800);
    const t2 = setTimeout(() => setPhase("fight"), 2000);
    const t3 = setTimeout(onDismiss, 5000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-arcade-dark overflow-hidden">
      {/* Background flash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(26,109,255,0.3) 0%, rgba(6,8,16,0) 70%)",
        }}
      />

      {/* Station label */}
      <div className="absolute top-8 left-0 right-0 text-center">
        <p
          className="pixel-text font-heading text-arcade-cyan text-xs"
          style={{ textShadow: "0 0 10px rgba(0,229,255,0.5)" }}
        >
          {stationLabel.toUpperCase()}
        </p>
      </div>

      {/* Player A — left side */}
      <div
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-2/5 text-center transition-transform duration-300 ${
          phase === "slide" ? "-translate-x-full" : "translate-x-0"
        }`}
        style={{ transitionTimingFunction: "steps(5)" }}
      >
        <p
          className="text-8xl sm:text-9xl mb-4"
          style={{
            imageRendering: "pixelated",
            filter: "drop-shadow(0 0 20px rgba(26,109,255,0.5))",
          }}
        >
          {playerA?.avatar_emoji || "?"}
        </p>
        <p
          className="pixel-text font-heading text-arcade-yellow text-xs sm:text-sm"
          style={{ textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000" }}
        >
          {playerA?.display_name || "TBD"}
        </p>
      </div>

      {/* VS text */}
      {phase !== "slide" && (
        <div className="relative z-10 screen-shake">
          <h1
            className="pixel-text font-heading text-arcade-red"
            style={{
              fontSize: "clamp(4rem, 12vw, 8rem)",
              textShadow:
                "0 0 30px rgba(224,32,32,0.8), 0 0 60px rgba(224,32,32,0.4), 4px 4px 0 #000",
              letterSpacing: "0.1em",
            }}
          >
            VS
          </h1>
        </div>
      )}

      {/* Player B — right side */}
      <div
        className={`absolute right-0 top-1/2 -translate-y-1/2 w-2/5 text-center transition-transform duration-300 ${
          phase === "slide" ? "translate-x-full" : "translate-x-0"
        }`}
        style={{ transitionTimingFunction: "steps(5)" }}
      >
        <p
          className="text-8xl sm:text-9xl mb-4"
          style={{
            imageRendering: "pixelated",
            filter: "drop-shadow(0 0 20px rgba(255,45,155,0.5))",
          }}
        >
          {playerB?.avatar_emoji || "?"}
        </p>
        <p
          className="pixel-text font-heading text-arcade-magenta text-xs sm:text-sm"
          style={{
            textShadow: "0 0 10px rgba(255,45,155,0.5), 2px 2px 0 #000",
          }}
        >
          {playerB?.display_name || "TBD"}
        </p>
      </div>

      {/* ROUND 1 FIGHT */}
      {phase === "fight" && (
        <div className="absolute bottom-16 left-0 right-0 text-center">
          <p
            className="pixel-text font-heading text-arcade-yellow text-sm sm:text-base arcade-flash"
            style={{
              textShadow:
                "0 0 20px rgba(255,215,0,0.6), 0 0 40px rgba(255,215,0,0.3), 3px 3px 0 #000",
            }}
          >
            ROUND 1 — FIGHT!
          </p>
        </div>
      )}

      {/* Scanlines */}
      <div className="scanlines" />
    </div>
  );
}
