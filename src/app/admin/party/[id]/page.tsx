"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import type { Party, Event, EventFormat } from "@/lib/types";

const FORMAT_LABELS: Record<EventFormat, string> = {
  single_elim: "SINGLE ELIM",
  boss_mode: "BOSS MODE",
  hot_streak: "HOT STREAK",
  best_score: "BEST SCORE",
};

const FORMAT_COLORS: Record<EventFormat, string> = {
  single_elim: "text-arcade-blue",
  boss_mode: "text-arcade-red",
  hot_streak: "text-arcade-orange",
  best_score: "text-arcade-green",
};

const DEFAULT_CONFIGS: Record<EventFormat, object> = {
  single_elim: { bracket_size: 8, best_of: 1, allow_late_entry: true },
  boss_mode: {
    boss_player_id: "",
    win_threshold_pct: 51,
    boss_slayer_bonus: true,
  },
  hot_streak: {
    round1_streak_target: 3,
    max_qualifiers: 4,
    round2_format: "single_elim",
    round2_streak_target: 2,
  },
  best_score: { attempts_per_player: 2 },
};

interface PartyPlayer {
  id: string;
  display_name: string;
  avatar_emoji: string;
}

export default function PartyManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: partyId } = use(params);
  const [party, setParty] = useState<Party | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [players, setPlayers] = useState<PartyPlayer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create form state
  const [eventName, setEventName] = useState("");
  const [stationLabel, setStationLabel] = useState("");
  const [format, setFormat] = useState<EventFormat>("single_elim");
  const [configJson, setConfigJson] = useState(
    JSON.stringify(DEFAULT_CONFIGS.single_elim, null, 2)
  );
  const [creating, setCreating] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editStation, setEditStation] = useState("");
  const [editConfigJson, setEditConfigJson] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [partyRes, eventsRes, playersRes] = await Promise.all([
      fetch(`/api/parties/${partyId}`),
      fetch(`/api/events?party_id=${partyId}`),
      fetch(`/api/parties/${partyId}/players`),
    ]);
    if (partyRes.ok) setParty(await partyRes.json());
    if (eventsRes.ok) setEvents(await eventsRes.json());
    if (playersRes.ok) setPlayers(await playersRes.json());
  }, [partyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setConfigJson(JSON.stringify(DEFAULT_CONFIGS[format], null, 2));
  }, [format]);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const format_config = JSON.parse(configJson);
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_id: partyId,
          name: eventName.trim(),
          format,
          format_config,
          station_label: stationLabel.trim(),
        }),
      });
      if (res.ok) {
        setEventName("");
        setStationLabel("");
        setFormat("single_elim");
        setShowCreate(false);
        fetchData();
      }
    } catch {
      alert("Invalid JSON in config");
    }
    setCreating(false);
  }

  function startEditing(event: Event) {
    setEditingId(event.id);
    setEditName(event.name);
    setEditStation(event.station_label);
    setEditConfigJson(JSON.stringify(event.format_config, null, 2));
  }

  async function saveEdit(eventId: string) {
    setSaving(true);
    try {
      const format_config = JSON.parse(editConfigJson);
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          station_label: editStation.trim(),
          format_config,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchData();
      }
    } catch {
      alert("Invalid JSON in config");
    }
    setSaving(false);
  }

  async function updateEventStatus(eventId: string, status: string) {
    await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  async function deleteEvent(eventId: string) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    fetchData();
  }

  // Helper: update boss_player_id in the edit config JSON
  function setBossInConfig(playerId: string) {
    try {
      const config = JSON.parse(editConfigJson);
      config.boss_player_id = playerId;
      setEditConfigJson(JSON.stringify(config, null, 2));
    } catch {
      // If JSON is invalid, just replace the field
    }
  }

  // Helper: update boss_player_id in the create config JSON
  function setBossInCreateConfig(playerId: string) {
    try {
      const config = JSON.parse(configJson);
      config.boss_player_id = playerId;
      setConfigJson(JSON.stringify(config, null, 2));
    } catch {
      // If JSON is invalid, just replace the field
    }
  }

  // Get boss player ID from a config JSON string
  function getBossFromConfig(json: string): string {
    try {
      return JSON.parse(json).boss_player_id || "";
    } catch {
      return "";
    }
  }

  if (!party) {
    return (
      <div className="flex flex-1 items-center justify-center bg-arcade-dark">
        <p className="pixel-text font-heading text-arcade-border text-xs arcade-flash">
          LOADING...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-arcade-dark px-4 py-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1
            className="pixel-text font-heading text-arcade-yellow text-sm"
            style={{
              textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000",
            }}
          >
            {party.name}
          </h1>
          <Link
            href="/admin/parties"
            className="pixel-text font-heading text-arcade-cyan text-xs hover:text-arcade-blue"
          >
            ← BACK
          </Link>
        </div>
        <p className="pixel-text font-sans text-arcade-border text-sm mb-2">
          {party.status.toUpperCase()} — {events.length} event
          {events.length !== 1 ? "s" : ""} — {players.length} player
          {players.length !== 1 ? "s" : ""}
        </p>

        {/* Player roster */}
        {players.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-6">
            {players.map((p) => (
              <span
                key={p.id}
                className="text-sm border border-arcade-border px-1.5 py-0.5 bg-arcade-navy"
                title={p.display_name}
              >
                {p.avatar_emoji} <span className="pixel-text font-heading text-[8px] text-foreground">{p.display_name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={`/admin/party/${partyId}/qr`}
            className="border border-arcade-cyan bg-arcade-cyan/10 px-3 py-1 font-heading text-[10px] text-arcade-cyan hover:bg-arcade-cyan/30 pixel-text"
          >
            QR CODE
          </Link>
          <Link
            href={`/admin/party/${partyId}/run`}
            className="border border-arcade-green bg-arcade-green/10 px-3 py-1 font-heading text-[10px] text-arcade-green hover:bg-arcade-green/30 pixel-text"
          >
            RUN DASHBOARD
          </Link>
          <Link
            href={`/admin/party/${partyId}/photos`}
            className="border border-arcade-yellow bg-arcade-yellow/10 px-3 py-1 font-heading text-[10px] text-arcade-yellow hover:bg-arcade-yellow/30 pixel-text"
          >
            PHOTOS
          </Link>
          <Link
            href={`/display/party/${partyId}`}
            className="border border-arcade-magenta bg-arcade-magenta/10 px-3 py-1 font-heading text-[10px] text-arcade-magenta hover:bg-arcade-magenta/30 pixel-text"
          >
            TV DISPLAY
          </Link>
        </div>

        {/* Events header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="pixel-text font-heading text-arcade-blue text-xs">
            EVENTS
          </h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="border border-arcade-green bg-arcade-green/20 px-3 py-1 font-heading text-[10px] text-arcade-green hover:bg-arcade-green/40 pixel-text"
          >
            {showCreate ? "CANCEL" : "+ ADD EVENT"}
          </button>
        </div>

        {/* Create event form */}
        {showCreate && (
          <form
            onSubmit={createEvent}
            className="border-2 border-arcade-blue bg-arcade-navy p-4 mb-4 flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1">
              <label className="pixel-text font-heading text-arcade-cyan text-[10px]">
                EVENT NAME
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Ping Pong"
                className="bg-arcade-dark border border-arcade-border px-3 py-2 font-sans text-lg text-foreground placeholder:text-arcade-border focus:outline-none focus:border-arcade-blue"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="pixel-text font-heading text-arcade-cyan text-[10px]">
                STATION LABEL
              </label>
              <input
                type="text"
                value={stationLabel}
                onChange={(e) => setStationLabel(e.target.value)}
                placeholder="e.g. Ping Pong Table"
                className="bg-arcade-dark border border-arcade-border px-3 py-2 font-sans text-lg text-foreground placeholder:text-arcade-border focus:outline-none focus:border-arcade-blue"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="pixel-text font-heading text-arcade-cyan text-[10px]">
                FORMAT
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as EventFormat)}
                className="bg-arcade-dark border border-arcade-border px-3 py-2 font-sans text-lg text-foreground focus:outline-none focus:border-arcade-blue"
              >
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Boss picker for boss_mode */}
            {format === "boss_mode" && players.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="pixel-text font-heading text-arcade-red text-[10px]">
                  SELECT THE BOSS
                </label>
                <select
                  value={getBossFromConfig(configJson)}
                  onChange={(e) => setBossInCreateConfig(e.target.value)}
                  className="bg-arcade-dark border border-arcade-red px-3 py-2 font-sans text-lg text-foreground focus:outline-none focus:border-arcade-red"
                >
                  <option value="">-- Pick a player --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.avatar_emoji} {p.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {format === "boss_mode" && players.length === 0 && (
              <p className="pixel-text font-sans text-arcade-orange text-sm">
                No players have joined yet. Create the event now and set the Boss later using EDIT after someone joins.
              </p>
            )}

            <div className="flex flex-col gap-1">
              <label className="pixel-text font-heading text-arcade-cyan text-[10px]">
                FORMAT CONFIG (JSON)
              </label>
              <textarea
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                rows={6}
                className="bg-arcade-dark border border-arcade-border px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-arcade-blue resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={creating || !eventName.trim()}
              className="border-2 border-arcade-yellow bg-arcade-yellow/20 px-4 py-2 font-heading text-xs text-arcade-yellow hover:bg-arcade-yellow/40 disabled:opacity-40 pixel-text"
            >
              {creating ? "CREATING..." : "CREATE EVENT"}
            </button>
          </form>
        )}

        {/* Events list */}
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="border-2 border-arcade-border bg-arcade-navy p-4"
            >
              {/* View mode */}
              {editingId !== event.id && (
                <>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="pixel-text font-heading text-foreground text-xs">
                        {event.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`pixel-text font-heading text-[10px] ${
                            FORMAT_COLORS[event.format]
                          }`}
                        >
                          {FORMAT_LABELS[event.format]}
                        </span>
                        {event.station_label && (
                          <span className="pixel-text font-sans text-arcade-border text-sm">
                            @ {event.station_label}
                          </span>
                        )}
                      </div>
                      {/* Show boss name for boss_mode */}
                      {event.format === "boss_mode" && (() => {
                        const config = event.format_config as { boss_player_id?: string };
                        const boss = players.find((p) => p.id === config.boss_player_id);
                        return boss ? (
                          <p className="pixel-text font-sans text-arcade-red text-sm mt-1">
                            Boss: {boss.avatar_emoji} {boss.display_name}
                          </p>
                        ) : config.boss_player_id ? (
                          <p className="pixel-text font-sans text-arcade-orange text-sm mt-1">
                            Boss: not set
                          </p>
                        ) : (
                          <p className="pixel-text font-sans text-arcade-orange text-sm mt-1">
                            Boss: not set
                          </p>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`pixel-text font-heading text-[10px] ${
                          event.status === "active"
                            ? "text-arcade-green"
                            : event.status === "completed"
                            ? "text-arcade-magenta"
                            : "text-arcade-border"
                        }`}
                      >
                        {event.status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="text-arcade-red hover:text-red-400 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {event.status === "setup" && (
                      <>
                        <button
                          onClick={() => startEditing(event)}
                          className="border border-arcade-cyan bg-arcade-cyan/10 px-3 py-1 font-heading text-[10px] text-arcade-cyan hover:bg-arcade-cyan/30 pixel-text"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => updateEventStatus(event.id, "active")}
                          className="border border-arcade-green bg-arcade-green/10 px-3 py-1 font-heading text-[10px] text-arcade-green hover:bg-arcade-green/30 pixel-text"
                        >
                          START
                        </button>
                      </>
                    )}
                    {event.status === "active" && (
                      <button
                        onClick={() => updateEventStatus(event.id, "completed")}
                        className="border border-arcade-magenta bg-arcade-magenta/10 px-3 py-1 font-heading text-[10px] text-arcade-magenta hover:bg-arcade-magenta/30 pixel-text"
                      >
                        END EVENT
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Edit mode */}
              {editingId === event.id && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="pixel-text font-heading text-arcade-cyan text-[10px]">
                      EVENT NAME
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-arcade-dark border border-arcade-border px-3 py-2 font-sans text-lg text-foreground focus:outline-none focus:border-arcade-blue"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="pixel-text font-heading text-arcade-cyan text-[10px]">
                      STATION LABEL
                    </label>
                    <input
                      type="text"
                      value={editStation}
                      onChange={(e) => setEditStation(e.target.value)}
                      className="bg-arcade-dark border border-arcade-border px-3 py-2 font-sans text-lg text-foreground focus:outline-none focus:border-arcade-blue"
                    />
                  </div>

                  {/* Boss picker in edit mode */}
                  {event.format === "boss_mode" && (
                    <div className="flex flex-col gap-1">
                      <label className="pixel-text font-heading text-arcade-red text-[10px]">
                        SELECT THE BOSS
                      </label>
                      {players.length > 0 ? (
                        <select
                          value={getBossFromConfig(editConfigJson)}
                          onChange={(e) => setBossInConfig(e.target.value)}
                          className="bg-arcade-dark border border-arcade-red px-3 py-2 font-sans text-lg text-foreground focus:outline-none focus:border-arcade-red"
                        >
                          <option value="">-- Pick a player --</option>
                          {players.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.avatar_emoji} {p.display_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="pixel-text font-sans text-arcade-orange text-sm">
                          No players have joined yet. Share the QR code first.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="pixel-text font-heading text-arcade-cyan text-[10px]">
                      FORMAT CONFIG (JSON)
                    </label>
                    <textarea
                      value={editConfigJson}
                      onChange={(e) => setEditConfigJson(e.target.value)}
                      rows={6}
                      className="bg-arcade-dark border border-arcade-border px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:border-arcade-blue resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 border border-arcade-border px-3 py-2 font-heading text-[10px] text-arcade-border hover:text-foreground pixel-text"
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={() => saveEdit(event.id)}
                      disabled={saving || !editName.trim()}
                      className="flex-1 border-2 border-arcade-yellow bg-arcade-yellow/20 px-3 py-2 font-heading text-[10px] text-arcade-yellow hover:bg-arcade-yellow/40 disabled:opacity-40 pixel-text"
                    >
                      {saving ? "SAVING..." : "SAVE"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {events.length === 0 && (
            <p className="pixel-text font-sans text-arcade-border text-center text-lg py-8">
              No events yet. Add one above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
