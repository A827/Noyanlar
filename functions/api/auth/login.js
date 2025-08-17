// Route: /api/auth/login
// Body: { name, pass }
const json = (d, s=200)=> new Response(JSON.stringify(d), {status:s, headers:{'content-type':'application/json'}});

export async function onRequestPost({ request, env }) {
  const { name, pass } = await request.json().catch(()=>({}));
  if (!name || !pass) return json({ error:"name & pass required" }, 400);

  const row = await env.DB.prepare(`SELECT id, name, email, phone, role FROM users WHERE LOWER(name)=LOWER(?) AND pass=?`)
    .bind(String(name).trim(), String(pass))
    .first();

  if (!row) return json({ ok:false }, 401);
  return json({ ok:true, user: row });
}