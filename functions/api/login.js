const json = (d, s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json"}});

export const onRequestPost = async ({ request, env }) => {
  const { name, pass } = await request.json().catch(() => ({}));
  if (!name || !pass) return json({ ok:false, error:"name & pass required" }, 400);

  const { results } = await env.DB
    .prepare(`SELECT id, name, role FROM users WHERE lower(name)=lower(?) AND pass=? LIMIT 1`)
    .bind(name, pass) // TODO: hash compare
    .all();

  if (!results.length) return json({ ok:false, error:"invalid credentials" }, 401);

  // You can mint a Session/JWT later; for now just echo minimal profile.
  return json({ ok:true, user: results[0] });
};