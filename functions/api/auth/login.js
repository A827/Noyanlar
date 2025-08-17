export async function onRequestPost({ request, env }) {
  const body = await readJSON(request);
  const name = (body.name || '').trim();
  const pass = body.pass || '';

  if (!name || !pass) {
    return json({ ok: false, error: 'Missing credentials' }, 400);
  }

  try {
    // Look up the user in your D1 database (case-insensitive match)
    const row = await env.DB.prepare(
      'SELECT id, name, role, pass FROM users WHERE lower(name) = ?'
    ).bind(name.toLowerCase()).first();

    if (!row) {
      return json({ ok: false, error: 'User not found' }, 404);
    }

    // For now compare plain-text (later we can hash)
    if (row.pass !== pass) {
      return json({ ok: false, error: 'Invalid password' }, 401);
    }

    // Success: return user data
    return json({
      ok: true,
      user: { id: row.id, name: row.name, role: row.role }
    });
  } catch (err) {
    return json({ ok: false, error: err.message }, 500);
  }
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