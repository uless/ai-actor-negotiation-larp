import { requireTeacherCode } from "../lib/auth.mjs";
import { DEFAULT_MODEL } from "../lib/core.mjs";
import { PublicError } from "../lib/errors.mjs";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Use POST for this endpoint.", code: "METHOD_NOT_ALLOWED" });
  }
  try {
    requireTeacherCode(req.body?.teacherCode, process.env);
    return send(res, 200, {
      authenticated: true,
      model: String(process.env.ANTHROPIC_MODEL || DEFAULT_MODEL).trim(),
      demo: !process.env.ANTHROPIC_API_KEY
    });
  } catch (error) {
    const known = error instanceof PublicError;
    return send(res, known ? error.status : 500, {
      error: known ? error.message : "The app could not open.",
      code: known ? error.code : "INTERNAL_ERROR"
    });
  }
}
