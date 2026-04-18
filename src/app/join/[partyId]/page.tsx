"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { PlayerAvatar } from "@/components/player-avatar";
import type { Party, Event } from "@/lib/types";

const AVATAR_EMOJIS = [
  "🔥", "⚡", "💥", "🎯", "🏆", "👑", "🎮", "🎸",
  "🐉", "🦅", "🐍", "🦁", "🐺", "🦊", "🐻", "🦈",
  "💀", "👹", "🤖", "👽", "🦾", "🧠", "💎", "🌟",
  "🚀", "⚔️", "🛡️", "🗡️", "🔱", "🎪", "🌪️", "☄️",
];

type Step = "name" | "avatar" | "photo" | "events" | "ready";

export default function JoinPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = use(params);
  const router = useRouter();
  const [party, setParty] = useState<Party | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/players").then(async (res) => {
      if (res.ok) {
        router.push("/lobby");
      }
    });

    Promise.all([
      fetch(`/api/parties/${partyId}`),
      fetch(`/api/events?party_id=${partyId}`),
    ]).then(async ([partyRes, eventsRes]) => {
      if (partyRes.ok) setParty(await partyRes.json());
      if (eventsRes.ok) {
        const evts = await eventsRes.json();
        setEvents(evts);
        setSelectedEvents(evts.map((e: Event) => e.id));
      }
    });
  }, [partyId, router]);

  function toggleEvent(eventId: string) {
    setSelectedEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 400,
        maxSizeMB: 0.1,
        fileType: "image/jpeg",
        useWebWorker: true,
      });
      setPhotoFile(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch {
      // Fallback: use original
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        party_id: partyId,
        display_name: name.trim(),
        avatar_emoji: avatar,
        event_ids: selectedEvents,
      }),
    });

    if (res.ok) {
      const player = await res.json();

      // Upload photo if one was selected
      if (photoFile) {
        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append("photo", photoFile);
        await fetch(`/api/players/${player.id}/photo`, {
          method: "POST",
          body: formData,
        });
        setUploadingPhoto(false);
      }

      setShowReady(true);
      setTimeout(() => router.push("/lobby"), 2000);
    } else {
      setSubmitting(false);
    }
  }

  if (showReady) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-arcade-dark">
        <div className="text-center screen-shake">
          {photoPreview ? (
            <PlayerAvatar
              emoji={avatar}
              photoUrl={photoPreview}
              name={name}
              size={96}
              className="mx-auto mb-4"
            />
          ) : (
            <p className="text-7xl mb-4">{avatar}</p>
          )}
          <h1
            className="pixel-text font-heading text-arcade-green text-lg arcade-flash"
            style={{
              textShadow:
                "0 0 20px rgba(57,255,20,0.6), 0 0 40px rgba(57,255,20,0.3), 3px 3px 0 #000",
            }}
          >
            PLAYER READY
          </h1>
          <p className="pixel-text font-sans text-arcade-cyan text-xl mt-2">
            {name}
          </p>
        </div>
      </div>
    );
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
      <div className="max-w-sm mx-auto w-full">
        {/* Party title */}
        <div className="text-center mb-6">
          <h1
            className="pixel-text font-heading text-arcade-yellow text-sm mb-1"
            style={{
              textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000",
            }}
          >
            {party.name}
          </h1>
          <p className="pixel-text font-sans text-arcade-cyan text-lg">
            Join the tournament
          </p>
        </div>

        {/* Step 1: Name */}
        {step === "name" && (
          <div className="flex flex-col gap-4">
            <label className="pixel-text font-heading text-arcade-magenta text-xs text-center">
              WHAT&apos;S YOUR NAME?
            </label>
            <div className="border-2 border-arcade-blue bg-arcade-navy p-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ENTER NAME"
                maxLength={20}
                autoFocus
                className="w-full bg-transparent px-3 py-3 font-heading text-sm text-arcade-yellow placeholder:text-arcade-border focus:outline-none pixel-text text-center"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) setStep("avatar");
                }}
              />
            </div>
            <button
              onClick={() => setStep("avatar")}
              disabled={!name.trim()}
              className="border-2 border-arcade-yellow bg-arcade-yellow/20 px-4 py-3 font-heading text-xs text-arcade-yellow hover:bg-arcade-yellow/40 disabled:opacity-40 pixel-text"
            >
              NEXT →
            </button>
          </div>
        )}

        {/* Step 2: Avatar - SF2 character select */}
        {step === "avatar" && (
          <div className="flex flex-col gap-4">
            <label className="pixel-text font-heading text-arcade-magenta text-xs text-center">
              CHOOSE YOUR FIGHTER
            </label>

            {avatar && (
              <div className="text-center">
                <span
                  className="text-6xl inline-block"
                  style={{
                    filter: "drop-shadow(0 0 12px rgba(255,215,0,0.5))",
                  }}
                >
                  {avatar}
                </span>
              </div>
            )}

            <div
              className="grid grid-cols-8 gap-1 p-2 border-2 border-arcade-blue bg-arcade-navy"
              style={{
                boxShadow:
                  "0 0 10px rgba(26,109,255,0.3), inset 0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setAvatar(emoji)}
                  className={`text-2xl p-1.5 transition-all ${
                    avatar === emoji
                      ? "bg-arcade-yellow/30 border-2 border-arcade-yellow scale-110"
                      : "border-2 border-transparent hover:border-arcade-blue hover:bg-arcade-blue/20"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("name")}
                className="border border-arcade-border px-4 py-3 font-heading text-xs text-arcade-border hover:text-foreground pixel-text flex-1"
              >
                ← BACK
              </button>
              <button
                onClick={() => setStep("photo")}
                disabled={!avatar}
                className="border-2 border-arcade-yellow bg-arcade-yellow/20 px-4 py-3 font-heading text-xs text-arcade-yellow hover:bg-arcade-yellow/40 disabled:opacity-40 pixel-text flex-1"
              >
                NEXT →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Photo (optional) */}
        {step === "photo" && (
          <div className="flex flex-col gap-4">
            <label className="pixel-text font-heading text-arcade-magenta text-xs text-center">
              ADD YOUR PIC
            </label>

            <p className="pixel-text font-sans text-arcade-border text-sm text-center">
              Add a pic so people know who you are.
              <br />
              Or don&apos;t — we&apos;ll just use your emoji.
            </p>

            {/* Photo preview */}
            <div className="flex justify-center">
              {photoPreview ? (
                <PlayerAvatar
                  emoji={avatar}
                  photoUrl={photoPreview}
                  name={name}
                  size={120}
                />
              ) : (
                <span
                  className="text-7xl"
                  style={{
                    filter: "drop-shadow(0 0 12px rgba(255,215,0,0.5))",
                  }}
                >
                  {avatar}
                </span>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-arcade-cyan bg-arcade-cyan/20 px-4 py-3 font-heading text-xs text-arcade-cyan hover:bg-arcade-cyan/40 pixel-text"
              >
                {photoPreview ? "RETAKE PHOTO" : "TAKE PHOTO"}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("avatar")}
                className="border border-arcade-border px-4 py-3 font-heading text-xs text-arcade-border hover:text-foreground pixel-text flex-1"
              >
                ← BACK
              </button>
              <button
                onClick={() => setStep("events")}
                className="border-2 border-arcade-yellow bg-arcade-yellow/20 px-4 py-3 font-heading text-xs text-arcade-yellow hover:bg-arcade-yellow/40 pixel-text flex-1"
              >
                {photoPreview ? "NEXT →" : "SKIP →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Event selection */}
        {step === "events" && (
          <div className="flex flex-col gap-4">
            <label className="pixel-text font-heading text-arcade-magenta text-xs text-center">
              SELECT YOUR EVENTS
            </label>

            <div className="flex flex-col gap-2">
              {events.map((event) => (
                <button
                  key={event.id}
                  onClick={() => toggleEvent(event.id)}
                  className={`border-2 p-3 text-left transition-all ${
                    selectedEvents.includes(event.id)
                      ? "border-arcade-green bg-arcade-green/10"
                      : "border-arcade-border bg-arcade-navy hover:border-arcade-blue"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="pixel-text font-heading text-xs text-foreground">
                        {event.name}
                      </p>
                      {event.station_label && (
                        <p className="pixel-text font-sans text-arcade-border text-sm mt-0.5">
                          @ {event.station_label}
                        </p>
                      )}
                    </div>
                    <span
                      className={`pixel-text font-heading text-lg ${
                        selectedEvents.includes(event.id)
                          ? "text-arcade-green"
                          : "text-arcade-border"
                      }`}
                    >
                      {selectedEvents.includes(event.id) ? "✓" : "○"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep("photo")}
                className="border border-arcade-border px-4 py-3 font-heading text-xs text-arcade-border hover:text-foreground pixel-text flex-1"
              >
                ← BACK
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || selectedEvents.length === 0}
                className="border-2 border-arcade-green bg-arcade-green/20 px-4 py-3 font-heading text-xs text-arcade-green hover:bg-arcade-green/40 disabled:opacity-40 pixel-text flex-1"
              >
                {submitting
                  ? uploadingPhoto
                    ? "UPLOADING..."
                    : "JOINING..."
                  : "JOIN PARTY"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
