// functions/api/auth/logout.js
export async function onRequestPost({ json }) {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      // expire cookie
      "set-cookie": "sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
    }
  });
}