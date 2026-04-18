"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface ArcadeCameraProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function ArcadeCamera({ onCapture, onCancel }: ArcadeCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const capturedBlobRef = useRef<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [flashing, setFlashing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [started, setStarted] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    stopStream();
    setCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 800 }, height: { ideal: 800 } },
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
  }, [stopStream]);

  useEffect(() => {
    return stopStream;
  }, [stopStream]);

  function handleStartCamera() {
    startCamera(facingMode);
  }

  function handleFlip() {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    startCamera(newMode);
  }

  // Use the 'playing' event — fires after the first frame is actually rendered
  function handleVideoPlaying() {
    setCameraReady(true);
  }

  function handleSnap() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Use requestAnimationFrame to ensure we're on a painted frame
    requestAnimationFrame(() => {
      const size = Math.min(video.videoWidth, video.videoHeight);
      const offsetX = (video.videoWidth - size) / 2;
      const offsetY = (video.videoHeight - size) / 2;

      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, 400, 400);

      // Convert to blob immediately while the canvas is hot
      canvas.toBlob(
        (blob) => {
          if (blob) {
            capturedBlobRef.current = blob;
            const url = URL.createObjectURL(blob);
            setCapturedUrl(url);
          }
        },
        "image/jpeg",
        0.8
      );

      // Flash
      setFlashing(true);
      setTimeout(() => setFlashing(false), 150);

      // Stop camera
      stopStream();
    });
  }

  function handleRetake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    capturedBlobRef.current = null;
    startCamera(facingMode);
  }

  function handleUse() {
    const blob = capturedBlobRef.current;
    if (!blob) return;
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    onCapture(file);
  }

  function handleFallbackFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  }

  // Camera error fallback
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
          ref={fallbackInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handleFallbackFile}
          className="hidden"
        />
        <button
          onClick={() => fallbackInputRef.current?.click()}
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

  // Review captured photo
  if (capturedUrl) {
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
          className="relative"
          style={{
            border: "6px solid #ffd700",
            boxShadow: "0 0 20px rgba(255,215,0,0.3)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={capturedUrl}
            alt="Captured"
            className="w-64 h-64 sm:w-80 sm:h-80 object-cover"
          />
        </div>

        <div className="flex flex-col gap-3 mt-8 w-64 sm:w-80">
          <button
            onClick={handleUse}
            className="border-2 border-arcade-yellow bg-arcade-yellow/20 px-6 py-4 font-heading text-sm text-arcade-yellow hover:bg-arcade-yellow/40 pixel-text"
            style={{
              boxShadow:
                "0 0 15px rgba(255,215,0,0.3), 4px 4px 0 #ff2d9b",
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

  // Camera view
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlaying={handleVideoPlaying}
        className={`absolute inset-0 w-full h-full object-cover ${started ? "" : "invisible"}`}
        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
      />

      {/* Red vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(224,32,32,0.2) 100%)",
        }}
      />

      {/* "READY?" text */}
      {cameraReady && (
        <div className="absolute top-12 left-0 right-0 text-center z-10">
          <p
            className="pixel-text font-heading text-arcade-yellow text-sm arcade-flash"
            style={{
              textShadow: "0 0 10px rgba(255,215,0,0.6), 2px 2px 0 #000",
            }}
          >
            READY?
          </p>
        </div>
      )}

      {/* Square frame guide */}
      {cameraReady && (
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
      )}

      {/* Flash overlay */}
      {flashing && (
        <div className="absolute inset-0 bg-white z-30" />
      )}

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center border-2 border-arcade-border bg-arcade-dark/80 text-arcade-border hover:text-foreground pixel-text font-heading text-sm"
      >
        ✕
      </button>

      {/* Flip camera button */}
      {cameraReady && (
        <button
          onClick={handleFlip}
          className="absolute top-4 left-4 z-20 px-3 py-2 border-2 border-arcade-border bg-arcade-dark/80 font-heading text-[10px] text-arcade-border hover:text-foreground pixel-text"
        >
          FLIP
        </button>
      )}

      {/* Start camera button */}
      {!started && (
        <button
          onClick={handleStartCamera}
          className="relative z-20 border-2 border-arcade-yellow bg-arcade-yellow/20 px-8 py-4 font-heading text-sm text-arcade-yellow hover:bg-arcade-yellow/40 pixel-text"
          style={{
            boxShadow: "0 0 15px rgba(255,215,0,0.3), 4px 4px 0 #ff2d9b",
          }}
        >
          OPEN CAMERA
        </button>
      )}

      {/* SNAP button */}
      {cameraReady && (
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
      )}

      {/* Scanlines */}
      <div className="scanlines" />
      {/* Canvas always in DOM, hidden */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
