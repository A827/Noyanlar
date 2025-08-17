// functions/_middleware.js
export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const path = url.pathname;

    // --- TEMP TEST BYPASS (DB checks) ---
    // Allow these endpoints to run without any auth/redirect:
    if (path === "/pingdb" || path === "/quotes") {
      return await context.next();
    }

    // --- YOUR AUTH WALL (kept minimal here) ---
    // If you have a login page/gate in your static app, keep it.
    // Add your real auth checks below (cookies/headers/etc.) when ready.
    // Example (pseudo):
    // const isAuthed = Boolean(context.request.headers.get("X-Session"));
    // if (!isAuthed) return Response.redirect(new URL("/", url), 302);

    // For now: just pass everything else through.
    return await context.next();

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}