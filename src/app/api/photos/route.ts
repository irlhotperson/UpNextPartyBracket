import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const partyId = searchParams.get("party_id");
  const eventId = searchParams.get("event_id");

  const supabase = createServerClient();
  let query = supabase
    .from("event_photos")
    .select("*")
    .order("display_order");

  if (eventId) {
    query = query.eq("event_id", eventId);
  } else if (partyId) {
    // Get party-wide photos (event_id is null) + photos for all party events
    const { data: events } = await supabase
      .from("events")
      .select("id")
      .eq("party_id", partyId);

    const eventIds = events?.map((e) => e.id) || [];
    // Photos with null event_id (party-wide) or matching event
    query = query.or(
      `event_id.is.null,event_id.in.(${eventIds.join(",")})`
    );
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Generate public URLs
  const photosWithUrls = (data || []).map((photo) => ({
    ...photo,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${photo.storage_path}`,
  }));

  return Response.json(photosWithUrls);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const partyId = formData.get("party_id") as string;
  const eventId = (formData.get("event_id") as string) || null;
  const files = formData.getAll("files") as File[];

  if (!partyId || files.length === 0) {
    return Response.json(
      { error: "party_id and at least one file required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();

  // Get current max display_order
  const { data: existing } = await supabase
    .from("event_photos")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  let orderStart = (existing?.[0]?.display_order || 0) + 1;
  const uploadedPhotos = [];

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const storagePath = `${partyId}/${eventId || "party"}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("event-photos")
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      continue;
    }

    const { data: photo, error: dbError } = await supabase
      .from("event_photos")
      .insert({
        event_id: eventId,
        storage_path: storagePath,
        display_order: orderStart++,
      })
      .select()
      .single();

    if (!dbError && photo) {
      uploadedPhotos.push({
        ...photo,
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/event-photos/${storagePath}`,
      });
    }
  }

  return Response.json(uploadedPhotos, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { reorder } = body; // Array of { id, display_order }

  if (!reorder || !Array.isArray(reorder)) {
    return Response.json({ error: "reorder array required" }, { status: 400 });
  }

  const supabase = createServerClient();

  for (const item of reorder) {
    await supabase
      .from("event_photos")
      .update({ display_order: item.display_order })
      .eq("id", item.id);
  }

  return Response.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get("id");

  if (!photoId) {
    return Response.json({ error: "Photo id required" }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get the photo to delete from storage
  const { data: photo } = await supabase
    .from("event_photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();

  if (photo) {
    await supabase.storage
      .from("event-photos")
      .remove([photo.storage_path]);
  }

  await supabase.from("event_photos").delete().eq("id", photoId);

  return Response.json({ success: true });
}
