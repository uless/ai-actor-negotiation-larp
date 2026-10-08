import { createHmac, createHash, timingSafeEqual } from "node:crypto";

const cookieName = "week7_teacher";

function hash(value) {
  return createHash("sha256").update(String(value)).digest();
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function signature(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function cookieValue(request) {
  const cookies = String(request.headers?.cookie || "").split(";");
  for (const cookie of cookies) {
    const [name, ...parts] = cookie.trim().split("=");
    if (name === cookieName) return parts.join("=");
  }
  return "";
}

export function passwordIsValid(candidate) {
  const expected = process.env.TEACHER_PASSWORD;
  if (!expected || !candidate) return false;
  return timingSafeEqual(hash(candidate), hash(expected));
}

export function createSessionCookie() {
  const secret = process.env.TEACHER_COOKIE_SECRET;
  if (!secret) throw new Error("Teacher session is not configured.");
  const payload = base64url(JSON.stringify({ expiresAt: Date.now() + (8 * 60 * 60 * 1000) }));
  const token = `${payload}.${signature(payload, secret)}`;
  return `${cookieName}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`;
}

export function clearSessionCookie() {
  return `${cookieName}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function hasTeacherSession(request) {
  const secret = process.env.TEACHER_COOKIE_SECRET;
  const token = cookieValue(request);
  if (!secret || !token) return false;
  const [payload, received] = token.split(".");
  if (!payload || !received) return false;
  const expected = signature(payload, secret);
  if (!timingSafeEqual(hash(received), hash(expected))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
}
