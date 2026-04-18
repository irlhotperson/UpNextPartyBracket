"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Party } from "@/lib/types";

export default function PartiesPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchParties = useCallback(async () => {
    const res = await fetch("/api/parties");
    if (res.ok) setParties(await res.json());
  }, []);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  async function createParty(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/parties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      setName("");
      fetchParties();
    }
    setCreating(false);
  }

  async function deleteParty(id: string) {
    if (!confirm("Delete this party and all its events?")) return;
    await fetch(`/api/parties/${id}`, { method: "DELETE" });
    fetchParties();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/parties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchParties();
  }

  return (
    <div className="flex flex-1 flex-col bg-arcade-dark px-4 py-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="pixel-text font-heading text-arcade-yellow text-sm"
            style={{ textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000" }}
          >
            PARTIES
          </h1>
          <Link
            href="/admin"
            className="pixel-text font-heading text-arcade-cyan text-xs hover:text-arcade-blue transition-colors"
          >
            ← BACK
          </Link>
        </div>

        {/* Create form */}
        <form onSubmit={createParty} className="flex gap-2 mb-8">
          <div className="flex-1 border-2 border-arcade-blue bg-arcade-navy p-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PARTY NAME"
              className="w-full bg-transparent px-3 py-2 font-heading text-xs text-arcade-yellow placeholder:text-arcade-border focus:outline-none pixel-text"
            />
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="border-2 border-arcade-green bg-arcade-green/20 px-4 py-2 font-heading text-xs text-arcade-green hover:bg-arcade-green/40 disabled:opacity-40 pixel-text whitespace-nowrap"
          >
            + NEW
          </button>
        </form>

        {/* Party list */}
        <div className="flex flex-col gap-3">
          {parties.map((party) => (
            <div
              key={party.id}
              className="border-2 border-arcade-border bg-arcade-navy p-4"
              style={{ boxShadow: "0 0 8px rgba(26,109,255,0.1)" }}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="pixel-text font-heading text-arcade-yellow text-xs">
                    {party.name}
                  </h2>
                  <span
                    className={`pixel-text font-sans text-sm mt-1 inline-block ${
                      party.status === "active"
                        ? "text-arcade-green"
                        : party.status === "completed"
                        ? "text-arcade-magenta"
                        : "text-arcade-border"
                    }`}
                  >
                    {party.status.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => deleteParty(party.id)}
                  className="pixel-text font-heading text-arcade-red text-xs hover:text-red-400"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {party.status === "setup" && (
                  <button
                    onClick={() => updateStatus(party.id, "active")}
                    className="border border-arcade-green bg-arcade-green/10 px-3 py-1 font-heading text-[10px] text-arcade-green hover:bg-arcade-green/30 pixel-text"
                  >
                    START
                  </button>
                )}
                {party.status === "active" && (
                  <button
                    onClick={() => updateStatus(party.id, "completed")}
                    className="border border-arcade-magenta bg-arcade-magenta/10 px-3 py-1 font-heading text-[10px] text-arcade-magenta hover:bg-arcade-magenta/30 pixel-text"
                  >
                    END PARTY
                  </button>
                )}
                <Link
                  href={`/admin/party/${party.id}`}
                  className="border border-arcade-blue bg-arcade-blue/10 px-3 py-1 font-heading text-[10px] text-arcade-blue hover:bg-arcade-blue/30 pixel-text"
                >
                  MANAGE
                </Link>
              </div>
            </div>
          ))}

          {parties.length === 0 && (
            <p className="pixel-text font-sans text-arcade-border text-center text-lg py-8">
              No parties yet. Create one above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
