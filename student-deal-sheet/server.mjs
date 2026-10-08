import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import roleSubmissions from "./api/role-submissions.mjs";
import teacherLogin from "./api/teacher-login.mjs";
import teacherLogout from "./api/teacher-logout.mjs";
import health from "./api/health.mjs";

const root = process.cwd();

async function loadEnvFile(filename) {
  try {
    const text = await readFile(join(root, filename), "utf8");
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

await loadEnvFile(".env.local");
const port = Number(process.env.PORT || 3000);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const apiRoutes = new Map([
  ["/api/health", health],
  ["/api/role-submissions", roleSubmissions],
  ["/api/teacher-login", teacherLogin],
  ["/api/teacher-logout", teacherLogout]
]);

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const apiHandler = apiRoutes.get(url.pathname);
    if (apiHandler) {
      request.body = await readBody(request);
      return apiHandler(request, response);
    }
    const relativePath = url.pathname === "/"
      ? "index.html"
      : url.pathname === "/teach"
        ? "teach.html"
        : url.pathname.slice(1);
    const filePath = normalize(join(root, relativePath));
    if (!filePath.startsWith(root)) throw new Error("Invalid path");
    const data = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`Week 7 role negotiation: http://localhost:${port}`);
});
