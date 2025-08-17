export const onRequestGet = async () =>
  new Response(JSON.stringify({ ok: true, when: new Date().toISOString() }), {
    headers: { "content-type": "application/json" }
  });