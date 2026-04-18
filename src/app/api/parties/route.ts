import { createServerClient } from "@/lib/supabase/server";
import { isAdminAuthenticated } from "@/lib/admin";

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("parties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("parties")
    .insert({ name })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
