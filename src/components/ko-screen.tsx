"use client";

import { useEffect } from "react";
import { PlayerAvatar } from "./player-avatar";

interface KOScreenProps {
  winner: { display_name: string; avatar_emoji: string; avatar_photo_url?: string | null } | null;
  type: "ko" | "boss_defeated" | "qualified";
  onDismiss: () => void;
}

export function KOScreen({ winner, type, onDismiss }: KOScreenProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const title =
    type === "boss_defeated"
      ? "BOSS DEFEATED!"
      : type === "qualified"
      ? "QUALIFIED!"
      : "K.O.!";

  const subtitle =
    type === "boss_defeated"
      ? "BOSS SLAYER"
      : type === "qualified"
      ? "ROUND 2 SECURED"
      : "YOU WIN!";

  const color =
    type === "boss_defeated"
      ? "text-arcade-red"
      : type === "qualified"
      ? "text-arcade-orange"
      : "text-arcade-green";

  const glowColor =
    type === "boss_defeated"
      ? "rgba(224,32,32,0.6)"
      : type === "qualified"
      ? "rgba(255,106,0,0.6)"
      : "rgba(57,255,20,0.6)";

  const bgGlow =
    type === "boss_defeated"
      ? "rgba(224,32,32,0.2)"
      : type === "qualified"
      ? "rgba(255,106,0,0.2)"
      : "rgba(57,255,20,0.2)";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-arcade-dark overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${bgGlow} 0%, rgba(6,8,16,0) 70%)`,
        }}
      />

      <div className="relative z-10 text-center screen-shake">
        {/* Winner avatar */}
        <div
          className="mb-6 flex justify-center"
          style={{ filter: `drop-shadow(0 0 30px ${glowColor})` }}
        >
          <PlayerAvatar
            emoji={winner?.avatar_emoji || "🏆"}
            photoUrl={winner?.avatar_photo_url}
            name={winner?.display_name}
            size={200}
          />
        </div>

        {/* K.O. / BOSS DEFEATED / QUALIFIED */}
        <h1
          className={`pixel-text font-heading ${color} arcade-flash`}
          style={{
            fontSize: "clamp(3rem, 10vw, 6rem)",
            textShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor}, 4px 4px 0 #000`,
          }}
        >
          {title}
        </h1>

        {/* Winner name */}
        <p
          className="pixel-text font-heading text-arcade-yellow text-sm mt-4"
          style={{
            textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000",
          }}
        >
          {winner?.display_name}
        </p>

        {/* Subtitle */}
        <p
          className="pixel-text font-sans text-arcade-cyan text-xl mt-2"
          style={{ textShadow: "0 0 8px rgba(0,229,255,0.3)" }}
        >
          {subtitle}
        </p>
      </div>

      <div className="scanlines" />
    </div>
  );
}
