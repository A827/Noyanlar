// functions/api/auth/login.js
export async function onRequestPost({ request, env }) {
  const body = await readJSON(request);
  const name = (body.name || '').trim();
  const pass = body.pass || '';

  if (!name || !pass) {
    return json({ ok: false, error: 'Missing credentials' }, 400);
  }

  // ... your D1 lookup here; example:
  // const row = await env.DB.prepare('SELECT id,name,role,pass FROM users WHERE lower(name)=?')
  //   .bind(name.toLowerCase()).first();

  // compare pass, build user object, etc.
  // return json({ ok: true, user });

  return json({ ok: false, error: 'Not implemented' }, 501);
}

/* utils */
async function readJSON(req) {
  try { return await req.json(); } catch { return {}; }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}