import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: matchId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("matches")
    .update({
      status: "in_progress",
      called_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Match not found or not pending" }, { status: 404 });

  return Response.json(data);
}
