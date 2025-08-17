// functions/api/users.js
export async function onRequest({ request, env }) {
  const db = env.DB;
  await ensureSchema(db);

  const method = request.method.toUpperCase();
  if (method === 'GET')    return listUsers(db);
  if (method === 'POST')   return createUser(request, db);
  if (method === 'PUT')    return updateUser(request, db);
  if (method === 'DELETE') return deleteUser(request, db);

  return json({ ok: false, error: 'Method not allowed' }, 405);
}

// GET /api/users
async function listUsers(db) {
  const rows = await db.prepare(
    `SELECT id, name, role, email, phone, created_at
       FROM users
      ORDER BY created_at DESC`
  ).all();
  return json(rows.results || []);
}

// POST /api/users  { name, pass, role?, email?, phone?, pin }
async function createUser(request, db) {
  const body = await safeJSON(request);
  const { name, pass, role='user', email='', phone='', pin='' } = body;

  if (!await isPinValid(db, pin)) return json({ ok:false, error:'Invalid admin PIN' }, 401);
  if (!name || !pass) return json({ ok:false, error:'Missing name or pass' }, 400);

  const id = cryptoRandomId();
  try {
    await db.prepare(
      `INSERT INTO users (id, name, pass, role, email, phone)
       VALUES (?, lower(?), ?, ?, ?, ?)`
    ).bind(id, name, pass, role === 'admin' ? 'admin' : 'user', email, phone).run();
  } catch (e) {
    // unique(name)
    if (String(e).includes('UNIQUE')) return json({ ok:false, error:'Username already exists' }, 409);
    throw e;
  }

  const user = await db.prepare(
    `SELECT id, name, role, email, phone, created_at FROM users WHERE id=?`
  ).bind(id).first();

  return json({ ok:true, user }, 201);
}

// PUT /api/users  { id, name?, pass?, role?, email?, phone?, pin }
async function updateUser(request, db) {
  const body = await safeJSON(request);
  const { id, name, pass, role, email, phone, pin } = body;

  if (!await isPinValid(db, pin)) return json({ ok:false, error:'Invalid admin PIN' }, 401);
  if (!id) return json({ ok:false, error:'Missing id' }, 400);

  const cur = await db.prepare(`SELECT * FROM users WHERE id=?`).bind(id).first();
  if (!cur) return json({ ok:false, error:'User not found' }, 404);

  // prevent demoting last admin
  if (cur.role === 'admin' && role === 'user') {
    const adminCount = await db.prepare(`SELECT count(*) AS c FROM users WHERE role='admin'`).first();
    if ((adminCount?.c|0) <= 1) return json({ ok:false, error:'At least one admin required' }, 400);
  }

  try {
    await db.prepare(
      `UPDATE users SET
          name = COALESCE(lower(?), name),
          pass = COALESCE(?, pass),
          role = COALESCE(?, role),
          email= COALESCE(?, email),
          phone= COALESCE(?, phone)
        WHERE id=?`
    ).bind(
      name ?? null,
      pass ?? null,
      role ? (role === 'admin' ? 'admin' : 'user') : null,
      email ?? null,
      phone ?? null,
      id
    ).run();
  } catch (e) {
    if (String(e).includes('UNIQUE')) return json({ ok:false, error:'Username already exists' }, 409);
    throw e;
  }

  const user = await db.prepare(
    `SELECT id, name, role, email, phone, created_at FROM users WHERE id=?`
  ).bind(id).first();

  return json({ ok:true, user });
}

// DELETE /api/users?id=...&pin=...
async function deleteUser(request, db) {
  const url = new URL(request.url);
  const id  = url.searchParams.get('id') || '';
  const pin = url.searchParams.get('pin') || '';

  if (!await isPinValid(db, pin)) return json({ ok:false, error:'Invalid admin PIN' }, 401);
  if (!id) return json({ ok:false, error:'Missing id' }, 400);

  const cur = await db.prepare(`SELECT id, role FROM users WHERE id=?`).bind(id).first();
  if (!cur) return json({ ok:false, error:'User not found' }, 404);

  if (cur.role === 'admin') {
    const adminCount = await db.prepare(`SELECT count(*) AS c FROM users WHERE role='admin'`).first();
    if ((adminCount?.c|0) <= 1) return json({ ok:false, error:'At least one admin required' }, 400);
  }

  await db.prepare(`DELETE FROM users WHERE id=?`).bind(id).run();
  return json({ ok:true });
}

/* ----------------- helpers ----------------- */
function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}
async function safeJSON(request){ try{ return await request.json(); }catch{ return {}; } }
async function isPinValid(db, pin){
  const row = await db.prepare(`SELECT val FROM settings WHERE key='admin_pin'`).first();
  return pin && row?.val && String(pin) === String(row.val);
}
function cryptoRandomId(){
  try{
    return ([1e7]+-1e3+-4e3+-8e3+-1e11)
      .replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  }catch{ return 'u_' + Math.random().toString(36).slice(2,10); }
}
async function ensureSchema(db){
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
  if (!pin) await db.prepare(`INSERT INTO settings(key,val) VALUES('admin_pin','1234')`).run();

  // Optional: seed an Admin if table is empty
  const anyUser = await db.prepare(`SELECT id FROM users LIMIT 1`).first();
  if (!anyUser) {
    await db.prepare(
      `INSERT INTO users (id, name, pass, role)
       VALUES (?, 'admin', '1234', 'admin')`
    ).bind(cryptoRandomId()).run();
  }
}