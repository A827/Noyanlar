// functions/api/auth/login.js
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost({ env, request }) {
  try {
    const { name, pass } = await request.json().catch(() => ({}));
    if (!name || !pass) return json({ ok: false, error: "Missing credentials" }, 400);

    // D1 binding must be configured as "DB" in your Pages project
    // [[d1_databases]]
    // binding = "DB"
    // database_name = "noy-db"   <-- whatever your D1 name is
    // database_id   = "..."      <-- its id
    const db = env.DB;

    // Case-insensitive username match + plain password check
    // Either style works; pick one:

    // 1) Using LOWER():
    // const stmt = db.prepare(
    //   "SELECT id, name, email, phone, role FROM users WHERE LOWER(name)=LOWER(?) AND pass=? LIMIT 1"
    // ).bind(name, pass);

    // 2) Using SQLite NOCASE collation (cleaner):
    const stmt = db
      .prepare(
        "SELECT id, name, email, phone, role FROM users WHERE name = ? COLLATE NOCASE AND pass = ? LIMIT 1"
      )
      .bind(name, pass);

    const user = await stmt.first();

    if (!user) return json({ ok: false, error: "Invalid credentials" }, 401);

    // (Optional) set a simple session cookie if you want server-side sessions later
    return json({ ok: true, user });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}