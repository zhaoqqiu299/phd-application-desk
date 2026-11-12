# PhD Application Desk

A small website for tracking PhD applications (programs, deadlines, documents, recommendation letters, fees), with an **Ask** panel that answers questions about your list using the Hopscotch Labs API.

Your API key stays on the server. The browser never sees it.

## What you need

- Node.js 18 or newer (no `npm install` needed: there are no dependencies)
- Your Hopscotch Labs API key

## Run it on your computer

```bash
cd phd-desk
export HOPSCOTCH_API_KEY="your-hopscotch-key"
export APP_PASSWORD="choose-a-password"
npm start
```

Then open http://localhost:3000. If you set `APP_PASSWORD`, the page asks for it once.

## Settings (environment variables)

| Variable | Required | Default | What it does |
|---|---|---|---|
| `HOPSCOTCH_API_KEY` | yes | none | Your Hopscotch Labs key |
| `APP_PASSWORD` | strongly recommended | none | Password for the site. **Without it, anyone who finds the URL can spend your API credit.** |
| `MODEL` | no | `anthropic/claude-opus-5-5` | Any model id Hopscotch lists, e.g. `anthropic/claude-sonnet-5-5` (cheaper) |
| `ALLOWED_ORIGIN` | for GitHub Pages | none | The Pages site's origin, e.g. `https://zhaoqqiu299.github.io` |
| `PORT` | no | `3000` | Port to listen on |
| `DATA_FILE` | no | `./data.json` | Where your program list is saved |
| `HOPSCOTCH_API_URL` | no | `https://api.hopscotchlabs.ai/v1/chat/completions` | API endpoint |

## Website on GitHub Pages

The page in `docs/` works by itself on GitHub Pages: each visitor's list is saved in their own browser. To turn it on: repo **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/docs`**. The site appears at `https://<your-username>.github.io/phd-application-desk/`.

The Ask panel needs the server below (GitHub Pages can't keep an API key secret). After you deploy the server:

1. In `docs/index.html`, set `const API_BASE = "https://your-server-address";`
2. On the server, set `ALLOWED_ORIGIN=https://<your-username>.github.io`
3. When a list comes from the server, everyone who knows `APP_PASSWORD` shares that one list.

## Put the server online

Any host that runs Node works (Render, Railway, Fly.io, a VPS). On the host:

1. Upload this folder (or push it to a GitHub repo and connect it).
2. Start command: `npm start`
3. Add `HOPSCOTCH_API_KEY` and `APP_PASSWORD` in the host's environment-variable settings. Never commit the key to the repo.
4. Your list is saved in `data.json`. On hosts with a temporary disk (for example Render's free plan) it is lost on restart. Attach a persistent disk and point `DATA_FILE` to it.

Static-only hosts like GitHub Pages or Netlify (without functions) **won't work**, because they can't keep the key secret.

## Files

- `server.mjs`: serves the page, saves your list, and forwards questions to Hopscotch
- `docs/index.html`: the website (GitHub Pages serves this folder)
