import { createServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isAdminAuthenticated } from "@/lib/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playerId } = await params;

  // Verify caller is the player themselves or admin
  const cookieStore = await cookies();
  const session = cookieStore.get("player_session");
  const isAdmin = await isAdminAuthenticated();

  const supabase = createServerClient();

  if (!isAdmin) {
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: player } = await supabase
      .from("players")
      .select("id, party_id")
      .eq("session_token", session.value)
      .single();

    if (!player || player.id !== playerId) {
      return Response.json({ error: "Not your profile" }, { status: 403 });
    }
  }

  // Get the player's party_id for the storage path
  const { data: player } = await supabase
    .from("players")
    .select("party_id")
    .eq("id", playerId)
    .single();

  if (!player) {
    return Response.json({ error: "Player not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("photo") as File;

  if (!file) {
    return Response.json({ error: "No photo provided" }, { status: 400 });
  }

  const storagePath = `player-avatars/${player.party_id}/${playerId}.jpg`;

  // Delete existing photo if any
  await supabase.storage.from("event-photos").remove([storagePath]);

  // Upload new photo
  const { error: uploadError } = await supabase.storage
    .from("event-photos")
    .upload(storagePath, file, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return Response.json({ error: uploadError.message }, { status: 500 });
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${storagePath}`;

  // Update player record
  const { error: updateError } = await supabase
    .from("players")
    .update({ avatar_photo_url: publicUrl })
    .eq("id", playerId);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ url: publicUrl });
}
