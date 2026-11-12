// Vercel serverless function: POST /api/ask
import { answer } from "../lib/advisor.mjs";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch { return res.status(400).json({ error: "bad_json" }); } }
  const { status, body: out } = await answer({ programs: body.programs, history: body.history, todos: body.todos });
  res.status(status).json(out);
}
