import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("event_entries")
    .select("*, events(*)")
    .eq("player_id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
