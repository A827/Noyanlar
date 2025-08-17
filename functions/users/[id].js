// GET /api/users/:id  |  PUT /api/users/:id  |  DELETE /api/users/:id
export async function onRequest({ request, params, env }) {
  const db = env.DB;
  const id = params.id;

  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });

  try {
    if (request.method === "GET") {
      const row = await db.prepare(
        `SELECT id, name, email, phone, role, created_at FROM users WHERE id=?;`
      ).bind(id).first();
      if (!row) return json({ ok:false, error:"not found" }, 404);
      return json({ ok:true, user: row });
    }

    if (request.method === "PUT") {
      const body = await request.json().catch(() => ({}));
      // read current
      const cur = await db.prepare(`SELECT * FROM users WHERE id=?;`).bind(id).first();
      if (!cur) return json({ ok:false, error:"not found" }, 404);

      const name  = (body.name ?? cur.name).trim();
      const email = (body.email ?? cur.email) || null;
      const phone = (body.phone ?? cur.phone) || null;
      const role  = ((body.role ?? cur.role).toLowerCase() === "admin") ? "admin" : "user";
      const pass  = (body.pass ?? cur.pass);

      if (!name) return json({ ok:false, error:"name required" }, 400);

      // unique name (ignore self)
      const dup = await db.prepare(
        `SELECT id FROM users WHERE lower(name)=lower(?) AND id<>?;`
      ).bind(name, id).first();
      if (dup) return json({ ok:false, error:"username already exists" }, 409);

      // ensure at least one admin remains
      if (cur.role === "admin" && role !== "admin") {
        const { count } = await db.prepare(
          `SELECT COUNT(*) as count FROM users WHERE role='admin' AND id<>?;`
        ).bind(id).first();
        if (Number(count) <= 0) return json({ ok:false, error:"at least one admin required" }, 400);
      }

      await db.prepare(
        `UPDATE users
         SET name=?1, email=?2, phone=?3, role=?4, pass=?5
         WHERE id=?6;`
      ).bind(name, email, phone, role, pass, id).run();

      const updated = await db.prepare(
        `SELECT id, name, email, phone, role, created_at FROM users WHERE id=?;`
      ).bind(id).first();
      return json({ ok:true, user: updated });
    }

    if (request.method === "DELETE") {
      // ensure at least one admin remains if we delete an admin
      const cur = await db.prepare(`SELECT role FROM users WHERE id=?;`).bind(id).first();
      if (!cur) return json({ ok:false, error:"not found" }, 404);
      if (cur.role === "admin") {
        const { count } = await db.prepare(
          `SELECT COUNT(*) as count FROM users WHERE role='admin' AND id<>?;`
        ).bind(id).first();
        if (Number(count) <= 0) return json({ ok:false, error:"at least one admin required" }, 400);
      }

      await db.prepare(`DELETE FROM users WHERE id=?;`).bind(id).run();
      return json({ ok:true });
    }

    return new Response("Method Not Allowed", { status: 405 });
  } catch (err) {
    return json({ ok:false, error:String(err) }, 500);
  }
}