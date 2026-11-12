# PhD Application Desk

A small website for tracking PhD applications (programs, deadlines, documents, recommendation letters, fees), with an **Ask** panel that answers questions about your list using the Hopscotch Labs API.

Your API key stays on the server. The browser never sees it.

## Deploy on Vercel (recommended)

1. Go to https://vercel.com/new and sign in with GitHub.
2. Import the `phd-application-desk` repository. Leave the framework preset as **Other** and the other settings as they are (`vercel.json` already sets them).
3. Under **Environment Variables**, add `HOPSCOTCH_API_KEY` (your key). Optionally add `MODEL`.
4. Click **Deploy**. Your site will be at `https://<project-name>.vercel.app`.

On Vercel, each visitor's program list is saved in their own browser, and `api/ask.js` answers questions using that list. There is no password: anyone with the link can ask questions, and each question uses your Hopscotch credit.

### Email agents (optional)

Two scheduled Claude agents check the owner's inbox every morning and write what they find to a **private** repo (`letters.json`, `emails.json`). The site's **Email** tab and the "Letters received" lines read that through `api/status.js`. To connect it, add these on Vercel:

| Variable | Value |
|---|---|
| `GITHUB_TOKEN` | A fine-grained GitHub token with **read-only Contents** access to the data repo only |
| `DATA_REPO` | `owner/repo` of the data repo (default `zhaoqqiu299/phd-desk-data`) |

Without them the Email tab says the agents aren't connected, and everything else still works.

## What you need to run it yourself

- Node.js 18 or newer (no `npm install` needed: there are no dependencies)
- Your Hopscotch Labs API key

## Run it on your computer

```bash
cd phd-application-desk
export HOPSCOTCH_API_KEY="your-hopscotch-key"
npm start
```

Then open http://localhost:3000. (Or put the settings in `.env` and run `npm run dev`.)

## Settings (environment variables)

| Variable | Required | Default | What it does |
|---|---|---|---|
| `HOPSCOTCH_API_KEY` | yes | none | Your Hopscotch Labs key |
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
3. When a list comes from the server, everyone who opens the site shares that one list.

## Put the server online

Any host that runs Node works (Render, Railway, Fly.io, a VPS). On the host:

1. Upload this folder (or push it to a GitHub repo and connect it).
2. Start command: `npm start`
3. Add `HOPSCOTCH_API_KEY` in the host's environment-variable settings. Never commit the key to the repo.
4. Your list is saved in `data.json`. On hosts with a temporary disk (for example Render's free plan) it is lost on restart. Attach a persistent disk and point `DATA_FILE` to it.

The server itself needs a host that runs Node: static hosts like GitHub Pages can't keep the key secret.

## Files

- `api/ask.js`: the Vercel function that answers questions
- `lib/advisor.mjs`: the prompt and Hopscotch call, shared by both setups
- `vercel.json`: tells Vercel to serve `docs/` with no build step
- `server.mjs`: the all-in-one server for other Node hosts (also saves your list to `data.json`)
- `docs/index.html`: the website (GitHub Pages serves this folder)
