"use client";

import { useState, useEffect, use } from "react";
import QRCode from "qrcode";
import type { Party } from "@/lib/types";

export default function QRCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: partyId } = use(params);
  const [party, setParty] = useState<Party | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    fetch(`/api/parties/${partyId}`).then(async (res) => {
      if (res.ok) setParty(await res.json());
    });

    const joinUrl = `${window.location.origin}/join/${partyId}`;
    QRCode.toDataURL(joinUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#ffd700",
        light: "#060810",
      },
    }).then(setQrDataUrl);
  }, [partyId]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-arcade-dark px-4">
      {/* Corner decorations */}
      <div className="absolute top-4 left-4 h-12 w-12 border-t-2 border-l-2 border-arcade-blue opacity-50" />
      <div className="absolute top-4 right-4 h-12 w-12 border-t-2 border-r-2 border-arcade-blue opacity-50" />
      <div className="absolute bottom-4 left-4 h-12 w-12 border-b-2 border-l-2 border-arcade-blue opacity-50" />
      <div className="absolute bottom-4 right-4 h-12 w-12 border-b-2 border-r-2 border-arcade-blue opacity-50" />

      <h1
        className="pixel-text font-heading text-arcade-yellow text-lg mb-2 arcade-flash"
        style={{
          textShadow: "0 0 20px rgba(255,215,0,0.6), 3px 3px 0 #000",
        }}
      >
        INSERT COIN TO JOIN
      </h1>

      {party && (
        <p className="pixel-text font-sans text-arcade-cyan text-2xl mb-8">
          {party.name}
        </p>
      )}

      {qrDataUrl && (
        <div
          className="border-4 border-arcade-yellow p-2 bg-arcade-dark"
          style={{
            boxShadow:
              "0 0 30px rgba(255,215,0,0.3), 0 0 60px rgba(255,215,0,0.1)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Code to join party"
            className="w-64 h-64 sm:w-80 sm:h-80"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      )}

      <p
        className="pixel-text font-heading text-arcade-magenta text-xs mt-8 arcade-flash"
        style={{ textShadow: "0 0 10px rgba(255,45,155,0.5)" }}
      >
        SCAN TO PLAY
      </p>
    </div>
  );
}
