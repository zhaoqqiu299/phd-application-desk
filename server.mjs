// PhD Application Desk — tiny zero-dependency server (Node 18+).
// Serves the page, saves your program list to data.json, and forwards questions
// to Hopscotch Labs so your API key never reaches the browser.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answer } from "./lib/advisor.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || ""; // e.g. https://zhaoqqiu299.github.io
const DATA_FILE =process.env.DATA_FILE || path.join(here, "data.json");

if (!process.env.HOPSCOTCH_API_KEY) console.warn("Warning: HOPSCOTCH_API_KEY is not set. The Ask panel will not work.");

const send = (res, status, body, type = "application/json") => {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

async function readBody(req, limit = 1_000_000) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error("too_large"); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}

async function loadPrograms() {
  try { return JSON.parse(await fs.readFile(DATA_FILE, "utf8")); } catch { return []; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  // Let a separately hosted page (e.g. GitHub Pages) call this server.
  if (ALLOWED_ORIGIN && req.headers.origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  }
  try {
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/programs" && req.method === "GET") return send(res, 200, await loadPrograms());

      if (url.pathname === "/api/programs" && req.method === "PUT") {
        const list = await readBody(req);
        if (!Array.isArray(list)) return send(res, 400, { error: "expected_array" });
        await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2));
        return send(res, 200, { ok: true });
      }

      if (url.pathname === "/api/ask" && req.method === "POST") {
        const body = await readBody(req);
        const programs = Array.isArray(body.programs) ? body.programs : await loadPrograms();
        const { status, body: out } = await answer({ programs, history: body.history, todos: body.todos });
        return send(res, status, out);
      }
      return send(res, 404, { error: "not_found" });
    }

    // static files
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    const full = path.join(here, "docs", path.normalize(file));
    if (!full.startsWith(path.join(here, "docs"))) return send(res, 403, "Forbidden", "text/plain");
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };
    const body = await fs.readFile(full).catch(() => null);
    if (!body) return send(res, 404, "Not found", "text/plain");
    res.writeHead(200, { "Content-Type": types[path.extname(full)] || "application/octet-stream" });
    res.end(body);
  } catch (e) {
    console.error(e);
    send(res, e.message === "too_large" ? 413 : 500, { error: "server_error" });
  }
});

server.listen(PORT, () => console.log(`PhD Application Desk running at http://localhost:${PORT}`));
