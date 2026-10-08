import { checkConnection } from "../lib/supabase.mjs";

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET");
    return response.end(JSON.stringify({ ok: false }));
  }
  try {
    await checkConnection();
    response.statusCode = 200;
    return response.end(JSON.stringify({ ok: true, storage: "connected" }));
  } catch (error) {
    console.error("Supabase health check failed", {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      code: error?.code
    });
    response.statusCode = 503;
    return response.end(JSON.stringify({ ok: false, storage: "unavailable" }));
  }
}
