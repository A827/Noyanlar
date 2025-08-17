// functions/api/pingdb.js
export async function onRequest({ env }) {
  try {
    // Run a simple query to check DB connection
    const result = await env.DB.prepare("SELECT datetime('now') as now;").first();

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Database is connected ✅",
        result,
      }),
      { headers: { "content-type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        message: "Database is NOT connected ❌",
        error: String(err),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}