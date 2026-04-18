import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: partyId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("players")
    .select("id, display_name, avatar_emoji, avatar_photo_url")
    .eq("party_id", partyId)
    .order("joined_at");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}
