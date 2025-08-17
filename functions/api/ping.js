// GET https://<your-site>.pages.dev/api/ping
export async function onRequest({ env }) {
  // env.DB will exist after you add the D1 binding named "DB"
  const row = await env.DB.prepare('SELECT datetime("now") AS now').first();
  return new Response(JSON.stringify({ ok: true, now: row?.now || null }), {
    headers: { 'Content-Type': 'application/json' }
  });
}