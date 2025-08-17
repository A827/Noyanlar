// functions/api/auth/login.js
export async function onRequestPost({ request, env }) {
  const db = env.DB;
  await ensureSchemaAndSeed(db);

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const name = (body.name || '').trim();
  const pass = body.pass || '';

  if (!name || !pass) {
    return json({ ok: false, error: 'Missing name or pass' }, 400);
  }

  // Case-insensitive username match
  const row = await db.prepare(
    `SELECT id, name, role, email, phone
       FROM users
      WHERE lower(name)=lower(?) AND pass=?`
  ).bind(name, pass).first();

  if (!row) {
    return json({ ok: false, error: 'User not found' }, 401);
  }

  return json({ ok: true, user: row });
}

/* -------------- helpers -------------- */
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

async function ensureSchemaAndSeed(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      pass TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      email TEXT,
      phone TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`),
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      val TEXT NOT NULL
    );`)
  ]);

  const pin = await db.prepare(`SELECT val FROM settings WHERE key='admin_pin'`).first();
  if (!pin) {
    await db.prepare(`INSERT INTO settings(key,val) VALUES('admin_pin','1234')`).run();
  }

  // ✅ Seed an admin user if users table is empty
  const anyUser = await db.prepare(`SELECT id FROM users LIMIT 1`).first();
  if (!anyUser) {
    await db.prepare(
      `INSERT INTO users (id, name, pass, role)
       VALUES (?, 'admin', '1234', 'admin')`
    ).bind(cryptoRandomId()).run();
  }
}

function cryptoRandomId(){
  try{
    return ([1e7]+-1e3+-4e3+-8e3+-1e11)
      .replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  }catch{ return 'u_' + Math.random().toString(36).slice(2,10); }
}