import { checkPassword, setAdminCookie } from "@/lib/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (!password || !checkPassword(password)) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }

  await setAdminCookie();
  return Response.json({ success: true });
}
