const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export const onRequestGet = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC`
  ).all();
  return json({ ok: true, users: results });
};

export const onRequestPost = async ({ request, env }) => {
  const body = await request.json().catch(() => ({}));
  const { name, email = "", phone = "", role = "user", pass } = body || {};
  if (!name || !pass) return json({ ok: false, error: "name and pass are required" }, 400);

  // prevent duplicate usernames (case-insensitive)
  const { results: dup } = await env.DB
    .prepare(`SELECT id FROM users WHERE lower(name)=lower(?) LIMIT 1`)
    .bind(name)
    .all();
  if (dup.length) return json({ ok: false, error: "username already exists" }, 409);

  const id = crypto.randomUUID();
  await env.DB
    .prepare(`INSERT INTO users (id, name, email, phone, role, pass) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, name, email, phone, role === "admin" ? "admin" : "user", pass) // TODO: hash later
    .run();

  return json({ ok: true, id }, 201);
};