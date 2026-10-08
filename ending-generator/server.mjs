import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import endingHandler from "./api/ending.js";
import sessionHandler from "./api/session.js";

const projectDir = path.dirname(fileURLToPath(import.meta.url));

async function loadEnvFile(filename) {
  try {
    const text = await readFile(path.join(projectDir, filename), "utf8");
    text.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const equals = trimmed.indexOf("=");
      if (equals < 1) return;
      const key = trimmed.slice(0, equals).trim();
      const value = trimmed.slice(equals + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await loadEnvFile(".env");
await loadEnvFile(".env.local");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function addSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16000) throw new Error("Request body is too large.");
  }
  return body ? JSON.parse(body) : {};
}

const server = http.createServer(async (req, res) => {
  addSecurityHeaders(res);
  const requestUrl = new URL(req.url || "/", "http://localhost");
  if (requestUrl.pathname === "/api/ending" || requestUrl.pathname === "/api/session") {
    try { req.body = await readJsonBody(req); }
    catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "The request was not valid JSON." }));
      return;
    }
    if (requestUrl.pathname === "/api/ending") await endingHandler(req, res);
    else await sessionHandler(req, res);
    return;
  }

  const requested = requestUrl.pathname === "/" ? "index.html" : decodeURIComponent(requestUrl.pathname.slice(1));
  const resolved = path.resolve(projectDir, requested);
  if (!resolved.startsWith(`${projectDir}${path.sep}`) && resolved !== path.join(projectDir, "index.html")) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }
  try {
    const file = await readFile(resolved);
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[path.extname(resolved)] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
});

const port = Number(process.env.PORT || 4174);
server.listen(port, "127.0.0.1", () => {
  const mode = process.env.ANTHROPIC_API_KEY ? "LIVE MODE" : "DEMO MODE";
  console.log(`MCOM 2010 Deal Endings: http://127.0.0.1:${port} (${mode})`);
});
