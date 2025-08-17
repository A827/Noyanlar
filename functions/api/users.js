// Route: /api/users
// Methods: GET (list), POST (create), PUT (update), DELETE (delete)
// Body JSON for POST/PUT: { id?, name, email?, phone?, role: "admin"|"user", pass?, pin }
const json = (data, init = 200) =>
  new Response(JSON.stringify(data), {
    status: typeof init === "number" ? init : 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC`
  ).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const { name, email = "", phone = "", role = "user", pass, pin } = body;

  const pinCur = (await env.DB.prepare(`SELECT value FROM meta WHERE key='admin_pin'`).first())
    ?.value ?? "1234";
  if (pin !== pinCur) return json({ error: "PIN invalid" }, 403);
  if (!name || !pass) return json({ error: "name & pass required" }, 400);

  try {
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO users (id, name, email, phone, role, pass)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, name.trim(), email.trim(), phone.trim(), role === "admin" ? "admin" : "user", pass).run();

    const user = await env.DB.prepare(
      `SELECT id, name, email, phone, role, created_at FROM users WHERE id=?`
    ).bind(id).first();

    return json({ ok: true, user }, 201);
  } catch (e) {
    // Unique name violation
    if (String(e.message || "").includes("UNIQUE")) {
      return json({ error: "name already exists" }, 409);
    }
    return json({ error: "db error", detail: String(e) }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const { id, name, email, phone, role, pass, pin } = body;

  if (!id) return json({ error: "id required" }, 400);
  const pinCur = (await env.DB.prepare(`SELECT value FROM meta WHERE key='admin_pin'`).first())
    ?.value ?? "1234";
  if (pin !== pinCur) return json({ error: "PIN invalid" }, 403);

  // Fetch current
  const current = await env.DB.prepare(`SELECT * FROM users WHERE id=?`).bind(id).first();
  if (!current) return json({ error: "not found" }, 404);

  // Prevent demoting last admin
  if (current.role === "admin" && role && role !== "admin") {
    const { count } = await env.DB.prepare(`SELECT COUNT(*) as count FROM users WHERE role='admin'`).first();
    if ((count ?? 0) <= 1) return json({ error: "at least one admin required" }, 400);
  }

  const newName  = (name ?? current.name).trim();
  const newEmail = (email ?? current.email ?? "").trim();
  const newPhone = (phone ?? current.phone ?? "").trim();
  const newRole  = role === "admin" ? "admin" : "user";
  const newPass  = pass ? String(pass) : current.pass;

  // Check duplicate if name changed
  if (newName.toLowerCase() !== String(current.name || "").toLowerCase()) {
    const dup = await env.DB.prepare(`SELECT id FROM users WHERE LOWER(name)=LOWER(?)`).bind(newName).first();
    if (dup && dup.id !== id) return json({ error: "name already exists" }, 409);
  }

  await env.DB.prepare(
    `UPDATE users SET name=?, email=?, phone=?, role=?, pass=? WHERE id=?`
  ).bind(newName, newEmail, newPhone, newRole, newPass, id).run();

  const user = await env.DB.prepare(
    `SELECT id, name, email, phone, role, created_at FROM users WHERE id=?`
  ).bind(id).first();

  return json({ ok: true, user });
}

export async function onRequestDelete({ request, env }) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const pin = url.searchParams.get("pin");
  if (!id) return json({ error: "id required" }, 400);

  const pinCur = (await env.DB.prepare(`SELECT value FROM meta WHERE key='admin_pin'`).first())
    ?.value ?? "1234";
  if (pin !== pinCur) return json({ error: "PIN invalid" }, 403);

  const target = await env.DB.prepare(`SELECT role FROM users WHERE id=?`).bind(id).first();
  if (!target) return json({ error: "not found" }, 404);

  if (target.role === "admin") {
    const { count } = await env.DB.prepare(`SELECT COUNT(*) as count FROM users WHERE role='admin'`).first();
    if ((count ?? 0) <= 1) return json({ error: "at least one admin required" }, 400);
  }

  await env.DB.prepare(`DELETE FROM users WHERE id=?`).bind(id).run();
  return json({ ok: true });
}