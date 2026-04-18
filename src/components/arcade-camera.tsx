"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ArcadeCameraProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

async function captureFrame(
  video: HTMLVideoElement,
  stream: MediaStream
): Promise<Blob | null> {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const size = Math.min(vw, vh);
  const ox = (vw - size) / 2;
  const oy = (vh - size) / 2;

  // Method 1: ImageCapture API (Chrome, Edge — not Safari)
  try {
    const track = stream.getVideoTracks()[0];
    if (track && "ImageCapture" in window) {
      const ic = new ImageCapture(track);
      // grabFrame returns ImageBitmap — not in all TS defs
      const bitmap: ImageBitmap = await (ic as unknown as { grabFrame(): Promise<ImageBitmap> }).grabFrame();
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, ox, oy, size, size, 0, 0, 400, 400);
      bitmap.close();
      return await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, "image/jpeg", 0.85)
      );
    }
  } catch {
    // fall through
  }

  // Method 2: drawImage from video element
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, ox, oy, size, size, 0, 0, 400, 400);
  return await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/jpeg", 0.85)
  );
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function ArcadeCamera({ onCapture, onCancel }: ArcadeCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [started, setStarted] = useState(false);
  const fallbackRef = useRef<HTMLInputElement>(null);

  // Desktop: skip custom camera, go straight to file input
  if (!isMobile()) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-arcade-dark px-4">
        <p className="pixel-text font-heading text-arcade-yellow text-xs mb-4">
          TAKE YOUR SHOT
        </p>
        <input
          ref={fallbackRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onCapture(f);
          }}
          className="hidden"
        />
        <button
          onClick={() => fallbackRef.current?.click()}
          className="border-2 border-arcade-cyan bg-arcade-cyan/20 px-6 py-3 font-heading text-xs text-arcade-cyan hover:bg-arcade-cyan/40 pixel-text mb-3"
        >
          CHOOSE PHOTO
        </button>
        <button
          onClick={onCancel}
          className="pixel-text font-heading text-arcade-border text-xs hover:text-foreground"
        >
          CANCEL
        </button>
        <div className="scanlines" />
      </div>
    );
  }

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(
    async (facing: "user" | "environment") => {
      stopStream();
      setCameraReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 800 },
            height: { ideal: 800 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStarted(true);
      } catch {
        setCameraError(true);
      }
    },
    [stopStream]
  );

  useEffect(() => stopStream, [stopStream]);

  async function handleSnap() {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (!video.videoWidth || !video.videoHeight) return;

    setFlashing(true);
    setTimeout(() => setFlashing(false), 150);

    const blob = await captureFrame(video, stream);
    if (blob) {
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      stopStream();
    }
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    startCamera(facingMode);
  }

  function handleUse() {
    if (!previewBlob) return;
    onCapture(new File([previewBlob], "avatar.jpg", { type: "image/jpeg" }));
  }

  function handleFallback(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onCapture(f);
  }

  // ── Error fallback ──
  if (cameraError) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-arcade-dark px-4">
        <p className="pixel-text font-heading text-arcade-yellow text-xs mb-4">
          CAMERA NOT AVAILABLE
        </p>
        <p className="pixel-text font-sans text-arcade-border text-sm mb-6 text-center">
          Upload a pic instead
        </p>
        <input
          ref={fallbackRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFallback}
          className="hidden"
        />
        <button
          onClick={() => fallbackRef.current?.click()}
          className="border-2 border-arcade-cyan bg-arcade-cyan/20 px-6 py-3 font-heading text-xs text-arcade-cyan hover:bg-arcade-cyan/40 pixel-text mb-3"
        >
          UPLOAD PHOTO
        </button>
        <button
          onClick={onCancel}
          className="pixel-text font-heading text-arcade-border text-xs hover:text-foreground"
        >
          CANCEL
        </button>
      </div>
    );
  }

  // ── Review screen ──
  if (previewUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-arcade-dark">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 50%, rgba(224,32,32,0.15) 100%)",
          }}
        />
        <div
          style={{
            border: "6px solid #ffd700",
            boxShadow: "0 0 20px rgba(255,215,0,0.3)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Captured"
            className="w-64 h-64 sm:w-80 sm:h-80 object-cover"
          />
        </div>
        <div className="flex flex-col gap-3 mt-8 w-64 sm:w-80">
          <button
            onClick={handleUse}
            className="border-2 border-arcade-yellow bg-arcade-yellow/20 px-6 py-4 font-heading text-sm text-arcade-yellow hover:bg-arcade-yellow/40 pixel-text"
            style={{
              boxShadow: "0 0 15px rgba(255,215,0,0.3), 4px 4px 0 #ff2d9b",
            }}
          >
            USE THIS
          </button>
          <button
            onClick={handleRetake}
            className="px-6 py-2 font-heading text-xs text-arcade-border hover:text-foreground pixel-text"
          >
            RETAKE
          </button>
        </div>
        <div className="scanlines" />
      </div>
    );
  }

  // ── Live camera view ──
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlaying={() => setCameraReady(true)}
        className={`absolute inset-0 w-full h-full object-cover ${started ? "" : "invisible"}`}
        style={{
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
        }}
      />

      {/* Red vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(224,32,32,0.2) 100%)",
        }}
      />

      {cameraReady && (
        <>
          {/* READY? */}
          <div className="absolute top-12 left-0 right-0 text-center z-10">
            <p
              className="pixel-text font-heading text-arcade-yellow text-sm arcade-flash"
              style={{
                textShadow:
                  "0 0 10px rgba(255,215,0,0.6), 2px 2px 0 #000",
              }}
            >
              READY?
            </p>
          </div>

          {/* Frame guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div
              className="relative w-64 h-64 sm:w-80 sm:h-80"
              style={{
                border: "6px solid rgba(255,215,0,0.6)",
                boxShadow:
                  "0 0 20px rgba(255,215,0,0.2), inset 0 0 20px rgba(0,0,0,0.3)",
              }}
            >
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-arcade-magenta" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-arcade-magenta" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-arcade-magenta" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-arcade-magenta" />
            </div>
          </div>

          {/* FLIP */}
          <button
            onClick={() => {
              const next =
                facingMode === "user" ? "environment" : "user";
              setFacingMode(next);
              startCamera(next);
            }}
            className="absolute top-4 left-4 z-20 px-3 py-2 border-2 border-arcade-border bg-arcade-dark/80 font-heading text-[10px] text-arcade-border hover:text-foreground pixel-text"
          >
            FLIP
          </button>

          {/* SNAP */}
          <div className="absolute bottom-12 left-0 right-0 flex justify-center z-20">
            <button
              onClick={handleSnap}
              className="border-4 border-arcade-yellow bg-arcade-dark/80 px-10 py-4 font-heading text-base text-arcade-yellow hover:bg-arcade-yellow/30 active:translate-y-1 pixel-text transition-transform"
              style={{
                boxShadow:
                  "0 0 20px rgba(255,215,0,0.4), 6px 6px 0 #ff2d9b",
              }}
            >
              SNAP
            </button>
          </div>
        </>
      )}

      {/* Flash */}
      {flashing && <div className="absolute inset-0 bg-white z-30" />}

      {/* Cancel */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center border-2 border-arcade-border bg-arcade-dark/80 text-arcade-border hover:text-foreground pixel-text font-heading text-sm"
      >
        ✕
      </button>

      {/* Start camera (initial) */}
      {!started && (
        <button
          onClick={() => startCamera(facingMode)}
          className="relative z-20 border-2 border-arcade-yellow bg-arcade-yellow/20 px-8 py-4 font-heading text-sm text-arcade-yellow hover:bg-arcade-yellow/40 pixel-text"
          style={{
            boxShadow: "0 0 15px rgba(255,215,0,0.3), 4px 4px 0 #ff2d9b",
          }}
        >
          OPEN CAMERA
        </button>
      )}

      <div className="scanlines" />
    </div>
  );
}
