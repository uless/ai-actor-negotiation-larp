import { createSessionCookie, passwordIsValid } from "../lib/auth.mjs";

function reply(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return reply(response, 405, { error: "Method not allowed." });
  }
  let body = request.body || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!passwordIsValid(body.password)) return reply(response, 401, { error: "That password did not work." });
  try {
    response.setHeader("Set-Cookie", createSessionCookie());
    return reply(response, 200, { ok: true });
  } catch {
    return reply(response, 503, { error: "The instructor page is not configured yet." });
  }
}
