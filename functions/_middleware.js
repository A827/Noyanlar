// functions/_middleware.js
export async function onRequest(context) {
  try {
    return await context.next();
  } catch (err) {
    return new Response(
      JSON.stringify({ ok:false, error:String(err) }),
      { status:500, headers:{ "content-type":"application/json" } }
    );
  }
}