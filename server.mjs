import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { handleJudge, handleTurn } from "./lib/xai.mjs";
import { readFileSync } from "node:fs";

try {
  const envText = readFileSync(new URL("./.env", import.meta.url), "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
} catch {
  /* no .env */
}

const ROOT = fileURLToPath(new URL("./public", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 20;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length >= max) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

function send(res, status, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(status, {
    "content-length": buf.length,
    ...headers,
  });
  res.end(buf);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { "content-type": "application/json; charset=utf-8" });
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 200_000) throw new Error("payload too large");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function keyFrom(req, body) {
  const header = req.headers["x-api-key"];
  if (typeof header === "string" && header.trim()) return header.trim();
  if (typeof body?.apiKey === "string" && body.apiKey.trim()) return body.apiKey.trim();
  return process.env.DEEPSEEK_API_KEY || process.env.XAI_API_KEY || "";
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local")
      .split(",")[0]
      .trim();

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, {
        ok: true,
        hasServerKey: Boolean(process.env.DEEPSEEK_API_KEY || process.env.XAI_API_KEY),
      });
      return;
    }

    if (req.method === "POST" && (url.pathname === "/api/turn" || url.pathname === "/api/judge")) {
      if (limited(ip)) {
        sendJson(res, 429, { ok: false, error: "Easy. Let the last round land." });
        return;
      }
      const body = await readBody(req);
      const apiKey = keyFrom(req, body);
      const result =
        url.pathname === "/api/turn" ? await handleTurn(body, apiKey) : await handleJudge(body, apiKey);
      sendJson(res, 200, result);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      send(res, 405, "Method Not Allowed");
      return;
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") pathname = "/index.html";
    const file = normalize(join(ROOT, pathname));
    if (relative(ROOT, file).startsWith("..") || !existsSync(file)) {
      send(res, 404, "Not found");
      return;
    }
    const data = await readFile(file);
    send(res, 200, data, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  } catch (err) {
    sendJson(res, 400, { ok: false, error: err instanceof Error ? err.message : "Bad request" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Prove Me Wrong — sit down at http://localhost:${PORT}`);
  if (!process.env.DEEPSEEK_API_KEY && !process.env.XAI_API_KEY) {
    console.log("No DEEPSEEK_API_KEY or XAI_API_KEY in the environment. Visitors can paste a key in the browser.");
  }
});
