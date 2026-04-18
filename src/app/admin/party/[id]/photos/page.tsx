"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import Link from "next/link";

interface Photo {
  id: string;
  event_id: string | null;
  storage_path: string;
  display_order: number;
  url: string;
}

export default function PhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: partyId } = use(params);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    const res = await fetch(`/api/photos?party_id=${partyId}`);
    if (res.ok) setPhotos(await res.json());
  }, [partyId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("party_id", partyId);
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          fetchPhotos();
        }, 500);
      } else {
        setUploading(false);
      }
    } catch {
      clearInterval(progressInterval);
      setUploading(false);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/api/photos?id=${photoId}`, { method: "DELETE" });
    fetchPhotos();
  }

  async function handleDragEnd(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const newPhotos = [...photos];
    const fromIndex = newPhotos.findIndex((p) => p.id === draggedId);
    const toIndex = newPhotos.findIndex((p) => p.id === targetId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggedId(null);
      return;
    }

    const [moved] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, moved);

    // Update display orders
    const reorder = newPhotos.map((p, i) => ({
      id: p.id,
      display_order: i + 1,
    }));

    setPhotos(newPhotos.map((p, i) => ({ ...p, display_order: i + 1 })));
    setDraggedId(null);

    await fetch("/api/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reorder }),
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-arcade-dark px-4 py-6">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1
            className="pixel-text font-heading text-arcade-yellow text-sm"
            style={{
              textShadow: "0 0 10px rgba(255,215,0,0.5), 2px 2px 0 #000",
            }}
          >
            PHOTOS
          </h1>
          <Link
            href={`/admin/party/${partyId}`}
            className="pixel-text font-heading text-arcade-cyan text-xs hover:text-arcade-blue"
          >
            ← BACK
          </Link>
        </div>

        {/* Upload button */}
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-arcade-blue bg-arcade-navy px-4 py-6 font-heading text-xs text-arcade-blue hover:bg-arcade-blue/10 disabled:opacity-40 pixel-text text-center"
          >
            {uploading ? "UPLOADING..." : "TAP TO SELECT PHOTOS"}
          </button>

          {/* Upload progress */}
          {uploading && (
            <div className="mt-2 h-2 bg-arcade-dark border border-arcade-border">
              <div
                className="h-full bg-arcade-blue transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <p className="pixel-text font-sans text-arcade-border text-sm mt-2 text-center">
            Select multiple photos from your camera roll
          </p>
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              draggable
              onDragStart={() => setDraggedId(photo.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDragEnd(photo.id)}
              className={`relative aspect-square border-2 ${
                draggedId === photo.id
                  ? "border-arcade-yellow opacity-50"
                  : "border-arcade-border"
              } overflow-hidden cursor-move`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => deletePhoto(photo.id)}
                className="absolute top-1 right-1 bg-arcade-dark/80 border border-arcade-red text-arcade-red w-6 h-6 flex items-center justify-center text-xs hover:bg-arcade-red/20"
              >
                ✕
              </button>
              <span className="absolute bottom-1 left-1 pixel-text font-heading text-[8px] text-foreground bg-arcade-dark/80 px-1">
                {photo.display_order}
              </span>
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <p className="pixel-text font-sans text-arcade-border text-center text-lg py-8">
            No photos uploaded yet
          </p>
        )}
      </div>
    </div>
  );
}
