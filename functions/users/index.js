// List all users (GET) / Create user (POST)
export async function onRequest({ request, env }) {
  const db = env.DB;

  // Small helper
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });

  try {
    if (request.method === "GET") {
      // list users (omit passwords in response)
      const { results } = await db.prepare(
        `SELECT id, name, email, phone, role, created_at
         FROM users
         ORDER BY created_at DESC;`
      ).all();
      return json({ ok: true, users: results || [] });
    }

    if (request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const name  = String(body.name || "").trim();
      const pass  = String(body.pass || "").trim();
      const email = String(body.email || "").trim() || null;
      const phone = String(body.phone || "").trim() || null;
      const role  = (String(body.role || "user").trim().toLowerCase() === "admin") ? "admin" : "user";

      if (!name || !pass) return json({ ok:false, error:"name and pass are required" }, 400);

      // unique name check
      const dup = await db.prepare(`SELECT id FROM users WHERE lower(name)=lower(?);`).bind(name).first();
      if (dup) return json({ ok:false, error:"username already exists" }, 409);

      const id = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO users (id, name, email, phone, role, pass)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6);`
      ).bind(id, name, email, phone, role, pass).run();

      const created = await db.prepare(
        `SELECT id, name, email, phone, role, created_at FROM users WHERE id=?;`
      ).bind(id).first();

      return json({ ok:true, user: created }, 201);
    }

    return new Response("Method Not Allowed", { status: 405 });
  } catch (err) {
    return json({ ok:false, error:String(err) }, 500);
  }
}