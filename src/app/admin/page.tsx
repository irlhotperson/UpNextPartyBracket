import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-arcade-dark px-4">
      <h1
        className="pixel-text font-heading text-arcade-yellow mb-4"
        style={{
          fontSize: "clamp(1rem, 4vw, 1.5rem)",
          textShadow: "0 0 10px rgba(255,215,0,0.5), 3px 3px 0 #000",
        }}
      >
        ADMIN PANEL
      </h1>
      <p className="pixel-text font-sans text-arcade-cyan text-xl mb-8">
        Command Center
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/admin/parties"
          className="border-2 border-arcade-blue bg-arcade-navy px-4 py-3 text-center font-heading text-xs text-arcade-blue hover:bg-arcade-blue/20 transition-colors pixel-text"
        >
          MANAGE PARTIES
        </Link>
      </div>
    </div>
  );
}
