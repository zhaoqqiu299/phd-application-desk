// PhD Application Desk — tiny zero-dependency server (Node 18+).
// Serves the page, saves your program list to data.json, and forwards questions
// to Hopscotch Labs so your API key never reaches the browser.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.HOPSCOTCH_API_KEY;
const API_URL = process.env.HOPSCOTCH_API_URL || "https://api.hopscotchlabs.ai/v1/chat/completions";
const MODEL = process.env.MODEL || "anthropic/claude-opus-5-5";
const PASSWORD = process.env.APP_PASSWORD || ""; // set this if the site is public
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || ""; // e.g. https://zhaoqqiu299.github.io
const DATA_FILE =process.env.DATA_FILE || path.join(here, "data.json");

if (!API_KEY) console.warn("Warning: HOPSCOTCH_API_KEY is not set. The Ask panel will not work.");
if (!PASSWORD) console.warn("Warning: APP_PASSWORD is not set. Anyone who can reach this server can use your API key.");

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

function buildSystem(programs) {
  const today = new Date().toISOString().slice(0, 10);
  const days = (d) => d ? Math.ceil((new Date(d + "T23:59:00") - new Date()) / 86400000) : "?";
  const rows = programs.map((p) =>
    `- ${p.school} | ${p.program || ""} | deadline ${p.deadline || "none"} (${days(p.deadline)} days) | status ${p.status} | ` +
    `SOP ${p.sop ? "done" : "todo"}, CV ${p.cv ? "done" : "todo"}, transcripts ${p.transcripts ? "done" : "todo"}, ` +
    `test scores ${p.scores ? "done" : "todo"}, letters ${p.lors || 0}/3 | fee $${p.fee || 0}${p.notes ? " | notes: " + p.notes : ""}`
  ).join("\n");
  return `You are a warm, practical PhD application advisor embedded in the applicant's tracking dashboard. Today is ${today}.
Their current program list:
${rows || "(no programs yet)"}

Answer concisely in plain text (short paragraphs or simple dashes, no markdown headings). Reply in the language the user writes in. Reference their actual programs and deadlines when relevant.`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  // Let a separately hosted page (e.g. GitHub Pages) call this server.
  if (ALLOWED_ORIGIN && req.headers.origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "content-type, x-app-password");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  }
  try {
    if (url.pathname.startsWith("/api/")) {
      if (PASSWORD && req.headers["x-app-password"] !== PASSWORD) return send(res, 401, { error: "wrong_password" });

      if (url.pathname === "/api/programs" && req.method === "GET") return send(res, 200, await loadPrograms());

      if (url.pathname === "/api/programs" && req.method === "PUT") {
        const list = await readBody(req);
        if (!Array.isArray(list)) return send(res, 400, { error: "expected_array" });
        await fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2));
        return send(res, 200, { ok: true });
      }

      if (url.pathname === "/api/ask" && req.method === "POST") {
        if (!API_KEY) return send(res, 500, { error: "Server has no HOPSCOTCH_API_KEY set." });
        const { history = [] } = await readBody(req);
        const messages = [
          { role: "system", content: buildSystem(await loadPrograms()) },
          ...history.filter((m) => ["user", "assistant"].includes(m.role)).slice(-20)
            .map((m) => ({ role: m.role, content: String(m.content).slice(0, 8000) })),
        ];
        let r;
        try {
          r = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
            body: JSON.stringify({ model: MODEL, messages, max_tokens: 4000 }),
          });
        } catch (e) {
          console.error("Could not reach Hopscotch:", e.cause?.code || e.message);
          return send(res, 502, { error: "Could not reach the AI service. Check the server's internet connection." });
        }
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          console.error("Hopscotch error", r.status, JSON.stringify(data).slice(0, 500));
          return send(res, 502, { error: `The AI service returned an error (${r.status}).` });
        }
        const answer = data.choices?.[0]?.message?.content || "";
        return send(res, 200, { answer: answer || "No answer came back. Try asking again." });
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
