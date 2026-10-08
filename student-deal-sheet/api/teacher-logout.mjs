import { clearSessionCookie } from "../lib/auth.mjs";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    return response.end();
  }
  response.statusCode = 204;
  response.setHeader("Set-Cookie", clearSessionCookie());
  response.setHeader("Cache-Control", "no-store");
  return response.end();
}
