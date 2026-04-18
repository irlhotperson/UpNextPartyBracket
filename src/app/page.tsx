export default function SplashPage() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-arcade-dark">
      {/* Radial glow background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(26,109,255,0.15) 0%, rgba(6,8,16,0) 70%)",
        }}
      />

      {/* Main title stack */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        {/* UP */}
        <h1
          className="pixel-text font-heading text-arcade-yellow arcade-flash select-none"
          style={{
            fontSize: "clamp(4rem, 15vw, 10rem)",
            lineHeight: 1,
            textShadow:
              "0 0 20px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3), 4px 4px 0 #000",
            letterSpacing: "0.1em",
          }}
        >
          UP
        </h1>

        {/* NEXT */}
        <h1
          className="pixel-text font-heading text-arcade-yellow select-none"
          style={{
            fontSize: "clamp(4rem, 15vw, 10rem)",
            lineHeight: 1,
            textShadow:
              "0 0 20px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3), 4px 4px 0 #000",
            letterSpacing: "0.1em",
          }}
        >
          NEXT
        </h1>

        {/* party bracket */}
        <p
          className="pixel-text font-sans text-arcade-cyan mt-4 select-none tracking-widest"
          style={{
            fontSize: "clamp(1.2rem, 4vw, 2.5rem)",
            textShadow:
              "0 0 10px rgba(0,229,255,0.5), 0 0 30px rgba(0,229,255,0.2)",
          }}
        >
          party bracket
        </p>
      </div>

      {/* INSERT COIN prompt */}
      <div className="relative z-10 mt-16">
        <p
          className="pixel-text font-heading text-arcade-magenta arcade-flash text-xs sm:text-sm tracking-wider select-none"
          style={{
            textShadow: "0 0 10px rgba(255,45,155,0.5)",
          }}
        >
          INSERT COIN TO START
        </p>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 h-8 w-8 border-t-2 border-l-2 border-arcade-blue opacity-50" />
      <div className="absolute top-4 right-4 h-8 w-8 border-t-2 border-r-2 border-arcade-blue opacity-50" />
      <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-arcade-blue opacity-50" />
      <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-arcade-blue opacity-50" />
    </div>
  );
}
