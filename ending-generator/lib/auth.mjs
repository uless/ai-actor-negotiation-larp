import { timingSafeEqual } from "node:crypto";
import { PublicError } from "./errors.mjs";

function equal(first, second) {
  const a = Buffer.from(String(first));
  const b = Buffer.from(String(second));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function requireTeacherCode(value, env = process.env) {
  const supplied = String(value || "").replace(/\u0000/g, "").trim();
  const expected = String(env.TEACHER_CODE || "").trim();
  if (!expected) {
    throw new PublicError("The teacher code is not configured.", 503, "NOT_CONFIGURED");
  }
  if (!supplied || supplied.length > 80 || !equal(supplied.toLowerCase(), expected.toLowerCase())) {
    throw new PublicError("That teacher code is not correct.", 401, "INVALID_TEACHER_CODE");
  }
}
