import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const partyId = searchParams.get("party_id");

  const supabase = createServerClient();
  let query = supabase.from("events").select("*").order("created_at");

  if (partyId) query = query.eq("party_id", partyId);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { party_id, name, format, format_config, station_label } = body;

  if (!party_id || !name || !format) {
    return Response.json(
      { error: "party_id, name, and format are required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      party_id,
      name,
      format,
      format_config: format_config || {},
      station_label: station_label || "",
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
