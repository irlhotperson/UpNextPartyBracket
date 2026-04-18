"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("WRONG PASSWORD");
        setLoading(false);
        return;
      }

      router.push("/admin");
    } catch {
      setError("CONNECTION FAILED");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-arcade-dark px-4">
      <div className="w-full max-w-sm">
        {/* Title */}
        <h1
          className="pixel-text font-heading text-arcade-yellow text-center mb-2"
          style={{
            fontSize: "clamp(1rem, 4vw, 1.5rem)",
            textShadow: "0 0 10px rgba(255,215,0,0.5), 3px 3px 0 #000",
          }}
        >
          ADMIN LOGIN
        </h1>
        <p
          className="pixel-text font-sans text-arcade-cyan text-center mb-8 text-lg"
          style={{ textShadow: "0 0 8px rgba(0,229,255,0.3)" }}
        >
          Enter the arena password
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className="border-2 border-arcade-blue bg-arcade-navy p-1"
            style={{
              boxShadow: "0 0 10px rgba(26,109,255,0.3), inset 0 0 20px rgba(0,0,0,0.5)",
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="PASSWORD"
              className="w-full bg-transparent px-3 py-3 font-heading text-sm text-arcade-yellow placeholder:text-arcade-border focus:outline-none pixel-text"
              autoFocus
            />
          </div>

          {error && (
            <p className="pixel-text font-heading text-arcade-red text-center text-xs arcade-flash">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="border-2 border-arcade-magenta bg-arcade-magenta/20 px-6 py-3 font-heading text-sm text-arcade-magenta hover:bg-arcade-magenta/40 active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed transition-colors pixel-text"
            style={{
              boxShadow: "0 0 10px rgba(255,45,155,0.3)",
            }}
          >
            {loading ? "ENTERING..." : "FIGHT"}
          </button>
        </form>

        {/* Corner decorations */}
        <div className="mt-12 flex justify-center">
          <p className="pixel-text font-sans text-arcade-border text-sm">
            UpNext Admin Panel
          </p>
        </div>
      </div>
    </div>
  );
}
