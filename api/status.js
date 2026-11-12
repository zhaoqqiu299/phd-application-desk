// Vercel serverless function: GET /api/status
// Reads what the scheduled email agents found (letters.json, emails.json)
// from a private GitHub repo, so the raw data never sits in this public repo.
const REPO = process.env.DATA_REPO || "zhaoqqiu299/phd-desk-data";

async function readJson(file, token) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/${file}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw+json", "User-Agent": "phd-desk" },
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${r.status} for ${file}`);
  return JSON.parse(await r.text());
}

export default async function handler(req, res) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(200).json({ configured: false });
  try {
    const [letters, emails] = await Promise.all([readJson("letters.json", token), readJson("emails.json", token)]);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");
    res.status(200).json({ configured: true, letters, emails });
  } catch (e) {
    console.error(e);
    res.status(502).json({ configured: true, error: "Couldn't read the agent data repo. Check GITHUB_TOKEN and DATA_REPO." });
  }
}
