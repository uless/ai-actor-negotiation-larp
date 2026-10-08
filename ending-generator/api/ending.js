import { requireTeacherCode } from "../lib/auth.mjs";
import { runEnding } from "../lib/core.mjs";
import { PublicError } from "../lib/errors.mjs";

const buckets = new Map();

function clientId(req) {
  const forwarded = req.headers?.["x-forwarded-for"];
  return String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

function enforceRateLimit(id) {
  const now = Date.now();
  const current = buckets.get(id);
  if (!current || now - current.startedAt >= 60 * 60 * 1000) {
    buckets.set(id, { startedAt: now, count: 1 });
    return;
  }
  current.count += 1;
  if (current.count > 30) {
    throw new PublicError("This app has reached 30 model calls this hour.", 429, "RATE_LIMIT");
  }
}

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
    enforceRateLimit(clientId(req));
    const output = await runEnding(req.body?.deal || {}, process.env);
    return send(res, 200, output);
  } catch (error) {
    const known = error instanceof PublicError;
    if (!known) console.error("Ending API failed without a public error code.");
    return send(res, known ? error.status : 500, {
      error: known ? error.message : "The model did not answer. Pick an ending yourself.",
      code: known ? error.code : "INTERNAL_ERROR"
    });
  }
}
