// functions/api/debug/users.js
export async function onRequestGet({ env }) {
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ ok:false, error:"No DB binding 'DB' found" }), {
        status: 500, headers: { "content-type":"application/json" }
      });
    }

    const rows = await env.DB.prepare(
      "SELECT id, name, role, TRIM(CAST(pass AS TEXT)) AS pass_text FROM users LIMIT 25"
    ).all();

    const count = await env.DB.prepare("SELECT COUNT(*) AS c FROM users").first();
    const pragma = await env.DB.prepare("PRAGMA table_info(users)").all();

    return new Response(JSON.stringify({
      ok: true,
      count: count?.c ?? 0,
      users: rows?.results ?? rows,   // D1 can return {results:[]}
      schema: pragma?.results ?? pragma
    }), { headers: { "content-type": "application/json" }});
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), {
      status: 500, headers: { "content-type":"application/json" }
    });
  }
}