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
    let name = (body.name ?? "").toString().trim();
    let pass = (body.pass ?? "").toString().trim();

    if (!name || !pass) return json({ ok: false, error: "Missing credentials" }, 400);
    if (!env.DB)       return json({ ok: false, error: "D1 binding DB not found" }, 500);

    // Case-insensitive username, trim password, and compare as TEXT.
    const stmt = env.DB.prepare(
      `SELECT id, name, email, phone, role
         FROM users
        WHERE name = ? COLLATE NOCASE
          AND CAST(TRIM(pass) AS TEXT) = CAST(TRIM(?) AS TEXT)
        LIMIT 1`
    ).bind(name, pass);

    const user = await stmt.first();

    if (!user) {
      // Help while we debug: also check if the username exists at all.
      const exists = await env.DB
        .prepare(`SELECT 1 FROM users WHERE name = ? COLLATE NOCASE LIMIT 1`)
        .bind(name)
        .first();
      if (!exists) return json({ ok: false, error: "User not found" }, 401);
      return json({ ok: false, error: "Password mismatch" }, 401);
    }

    return json({ ok: true, user }, 200);
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}