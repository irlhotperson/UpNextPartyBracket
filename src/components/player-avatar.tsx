"use client";

interface PlayerAvatarProps {
  emoji: string;
  photoUrl?: string | null;
  name?: string;
  size?: number; // px
  className?: string;
  onClick?: () => void;
}

export function PlayerAvatar({
  emoji,
  photoUrl,
  name,
  size = 48,
  className = "",
  onClick,
}: PlayerAvatarProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name || "Player"}
        onClick={onClick}
        className={`object-cover ${onClick ? "cursor-pointer" : ""} ${className}`}
        style={{
          width: size,
          height: size,
          border: `${Math.max(2, Math.round(size * 0.08))}px solid #ffd700`,
          imageRendering: "auto",
        }}
      />
    );
  }

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center justify-center ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{ fontSize: size * 0.7, width: size, height: size }}
    >
      {emoji}
    </span>
  );
}
