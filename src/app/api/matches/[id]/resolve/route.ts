import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";
import { advanceWinner } from "@/lib/match-utils";

// Admin override: resolve any match by picking a winner
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: matchId } = await params;
  const body = await request.json();
  const { winner_id } = body;

  if (!winner_id) {
    return Response.json({ error: "winner_id required" }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("matches")
    .update({
      status: "completed",
      winner_id,
      admin_resolved: true,
      completed_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Advance winner
  await advanceWinner(supabase, data);

  return Response.json(data);
}
