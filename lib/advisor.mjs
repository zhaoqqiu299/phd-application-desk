// Shared by server.mjs (any Node host) and api/ask.js (Vercel).
const API_URL = process.env.HOPSCOTCH_API_URL || "https://api.hopscotchlabs.ai/v1/chat/completions";
const MODEL = process.env.MODEL || "anthropic/claude-opus-5-5";

export function buildSystem(programs) {
  const today = new Date().toISOString().slice(0, 10);
  const days = (d) => d ? Math.ceil((new Date(d + "T23:59:00") - new Date()) / 86400000) : "?";
  const rows = (Array.isArray(programs) ? programs : []).slice(0, 100).map((p) =>
    `- ${p.school} | ${p.program || ""} | deadline ${p.deadline || "none"} (${days(p.deadline)} days) | status ${p.status} | ` +
    `SOP ${p.sop ? "done" : "todo"}, CV ${p.cv ? "done" : "todo"}, transcripts ${p.transcripts ? "done" : "todo"}, ` +
    `test scores ${p.scores ? "done" : "todo"}, letters ${p.lors || 0}/3 | fee $${p.fee || 0}${p.notes ? " | notes: " + String(p.notes).slice(0, 500) : ""}`
  ).join("\n");
  return `You are a warm, practical PhD application advisor embedded in the applicant's tracking dashboard. Today is ${today}.
Their current program list:
${rows || "(no programs yet)"}

Answer concisely in plain text (short paragraphs or simple dashes, no markdown headings). Reply in the language the user writes in. Reference their actual programs and deadlines when relevant.`;
}

// Returns { status, body } so each host can send it its own way.
export async function answer({ programs, history }) {
  const key = process.env.HOPSCOTCH_API_KEY;
  if (!key) return { status: 500, body: { error: "Server has no HOPSCOTCH_API_KEY set." } };
  const messages = [
    { role: "system", content: buildSystem(programs) },
    ...(Array.isArray(history) ? history : []).filter((m) => ["user", "assistant"].includes(m?.role)).slice(-20)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 8000) })),
  ];
  let r;
  try {
    r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: 4000 }),
    });
  } catch (e) {
    console.error("Could not reach Hopscotch:", e.cause?.code || e.message);
    return { status: 502, body: { error: "Could not reach the AI service." } };
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Hopscotch error", r.status, JSON.stringify(data).slice(0, 500));
    return { status: 502, body: { error: `The AI service returned an error (${r.status}).` } };
  }
  const text = data.choices?.[0]?.message?.content || "";
  return { status: 200, body: { answer: text || "No answer came back. Try asking again." } };
}
