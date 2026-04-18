"use client";

interface WatermarkProps {
  position?: "bottom-right" | "bottom-center";
  size?: number;
  opacity?: number;
}

const SHOW = process.env.NEXT_PUBLIC_SHOW_WATERMARK !== "false";

export function Watermark({
  position = "bottom-right",
  size = 60,
  opacity = 0.25,
}: WatermarkProps) {
  if (!SHOW) return null;

  const positionClasses =
    position === "bottom-center"
      ? "left-1/2 -translate-x-1/2 bottom-6"
      : "right-4 bottom-4";

  return (
    <div
      className={`fixed z-40 pointer-events-none ${positionClasses}`}
      style={{ opacity }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: size,
          height: size,
          border: `2px solid rgba(255,215,0,${opacity * 0.6})`,
          mixBlendMode: "screen",
        }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/irlhotperson-logo.png"
          alt=""
          className="w-full h-full object-cover"
          style={{ filter: "saturate(0.7) brightness(1.2)" }}
        />
        {/* Scanline overlay on the logo itself */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
            mixBlendMode: "multiply",
          }}
        />
      </div>
    </div>
  );
}
