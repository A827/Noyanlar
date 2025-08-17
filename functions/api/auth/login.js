// functions/api/auth/login.js
export async function onRequestPost({ request, env, json }) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const pass = String(body.pass || "");

  if (!name || !pass) {
    return json({ ok: false, error: "Missing credentials" }, { status: 400 });
  }

  // username match is case-insensitive on name
  const row = await env.DB
    .prepare("SELECT id, name, role, email, phone FROM users WHERE lower(name)=lower(?) AND pass=? LIMIT 1")
    .bind(name, pass)
    .first();

  if (!row) {
    return json({ ok: false, error: "Invalid username or password" }, { status: 401 });
  }

  // issue a simple session cookie (demo)
  const cookie = [
    `sid=${encodeURIComponent(row.id)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=604800" // 7 days
  ].join("; ");

  return new Response(JSON.stringify({ ok: true, user: row }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": cookie
    }
  });
}