// functions/api/auth/login.js
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost({ env, request }) {
  try {
    const body = await request.json().catch(() => ({}));
    const nameIn = (body.name ?? "").toString().trim();
    const passIn = (body.pass ?? "").toString().trim();

    if (!nameIn || !passIn) return json({ ok: false, error: "Missing credentials" }, 400);
    if (!env.DB)           return json({ ok: false, error: "D1 binding DB not found" }, 500);

    // Case-insensitive username, tolerant password compare (trim + cast to TEXT)
    const stmt = env.DB.prepare(
      `SELECT id, name, email, phone, role
         FROM users
        WHERE LOWER(name) = LOWER(?)
          AND TRIM(CAST(pass AS TEXT)) = TRIM(CAST(? AS TEXT))
        LIMIT 1`
    ).bind(nameIn, passIn);

    const user = await stmt.first();

    if (!user) {
      // Extra diagnostics to tell which side failed
      const uname = await env.DB
        .prepare(`SELECT 1 FROM users WHERE LOWER(name)=LOWER(?) LIMIT 1`)
        .bind(nameIn)
        .first();

      return json({
        ok: false,
        error: uname ? "Password mismatch" : "User not found",
        debug: { nameIn, passLen: passIn.length }
      }, 401);
    }

    return json({ ok: true, user }, 200);
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}