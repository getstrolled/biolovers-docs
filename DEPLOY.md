# Deploying the Biolovers help center

This repo is a [Mintlify](https://mintlify.com/) project. The MDX content + `docs.json` live here (you keep full control of the source). Mintlify hosts the rendered site and runs the search index.

## Local preview

From the repo root:

```bash
npm install
npm run dev
```

That runs `mint dev` (default port `3000`). The main app's dev server runs on port `1337`, so they don't collide.

If `mint` complains it isn't installed, install the global CLI once:

```bash
npm i -g mint
```

## First-time deploy

1. Sign in at [dashboard.mintlify.com](https://dashboard.mintlify.com) with the Biolovers GitHub account.
2. Click **New project** → connect this repo (`getstrolled/biolovers-docs`).
3. Leave **Doc folder** as the repo root (`/`) — `docs.json` is at the top level.
4. Hit **Deploy** — it publishes to `your-workspace.mintlify.app`.

## Custom domain — `help.biolovers.site`

1. In Mintlify dashboard → **Settings → Custom Domain**, add `help.biolovers.site`.
2. Mintlify will give you a `CNAME` target (e.g. `cname.mintlify-dns.com`).
3. In Cloudflare (Biolovers DNS) add:
   - Type: `CNAME`
   - Name: `help`
   - Target: the value Mintlify gave you
   - Proxy: **DNS only** (orange cloud OFF) — Mintlify terminates TLS itself.
4. Wait ~5 min, hit **Verify** in Mintlify. SSL is auto-provisioned.

## Updating content

Push to `main` — Mintlify auto-rebuilds on every push. PRs get a preview URL.

## Screenshots

All images in `images/` are real screenshots from the local dev server using the test account `showcase / 12345678`. Re-take them with the helpers in `scripts/`.

## Don't commit secrets

The Mintlify-side API keys (deploy hooks, custom-domain tokens, etc.) live only in the Mintlify dashboard, never in this repo.
