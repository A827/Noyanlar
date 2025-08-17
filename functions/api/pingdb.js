// functions/api/pingdb.js
export async function onRequest({ env }) {
  try {
    const row = await env.DB.prepare(`select datetime('now') as now`).first();
    return new Response(JSON.stringify({ ok:true, now: row?.now }), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }), {
      status: 500, headers: { 'content-type':'application/json' }
    });
  }
}