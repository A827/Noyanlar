const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export const onRequestPut = async ({ params, request, env }) => {
  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const { name, email, phone, role, pass } = body;

  // build dynamic update
  const fields = [];
  const vals = [];
  if (name != null)  { fields.push("name=?");  vals.push(name); }
  if (email != null) { fields.push("email=?"); vals.push(email); }
  if (phone != null) { fields.push("phone=?"); vals.push(phone); }
  if (role != null)  { fields.push("role=?");  vals.push(role === "admin" ? "admin" : "user"); }
  if (pass != null)  { fields.push("pass=?");  vals.push(pass); }

  if (!fields.length) return json({ ok: false, error: "no changes" }, 400);

  vals.push(id);
  const stmt = `UPDATE users SET ${fields.join(", ")} WHERE id=?`;
  const res = await env.DB.prepare(stmt).bind(...vals).run();

  return json({ ok: true, changed: res.meta.changes });
};

export const onRequestDelete = async ({ params, env }) => {
  const { id } = params;
  // block deleting last admin
  const { results: admins } = await env.DB.prepare(`SELECT COUNT(*) as c FROM users WHERE role='admin'`).all();
  const { results: target } = await env.DB.prepare(`SELECT role FROM users WHERE id=?`).bind(id).all();
  if (!target.length) return json({ ok: false, error: "not found" }, 404);
  if (target[0].role === "admin" && admins[0].c <= 1)
    return json({ ok: false, error: "at least one admin required" }, 400);

  const res = await env.DB.prepare(`DELETE FROM users WHERE id=?`).bind(id).run();
  return json({ ok: true, deleted: res.meta.changes });
};