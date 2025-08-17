// POST { name, pass } -> verifies credentials (no session yet, returns user without pass)
export async function onRequestPost({ request, env }) {
  const db = env.DB;
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });

  try {
    const { name, pass } = await request.json();
    if (!name || !pass) return json({ ok:false, error:"name and pass required" }, 400);

    const user = await db.prepare(`SELECT * FROM users WHERE lower(name)=lower(?);`).bind(name).first();
    if (!user || user.pass !== pass) return json({ ok:false, error:"invalid credentials" }, 401);

    // omit password in response
    delete user.pass;
    return json({ ok:true, user });
  } catch (e) {
    return json({ ok:false, error:String(e) }, 500);
  }
}