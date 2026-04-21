# Deployment

This repo is a [Mintlify](https://mintlify.com) project. Mintlify builds and hosts the rendered site; this repo is the source of truth for content (`docs.json`, MDX pages, images).

## Local preview

```bash
npm install
npm run dev
```

Default port `3000`. If `mint` isn't installed, install it once globally:

```bash
npm i -g mint
```

## First-time setup

1. Sign in at [dashboard.mintlify.com](https://dashboard.mintlify.com) with the project's GitHub account.
2. **New project** → connect this repo (`getstrolled/biolovers-docs`).
3. Leave the **Doc folder** as the repo root (`/`). `docs.json` lives at the top level.
4. **Deploy** — publishes to `your-workspace.mintlify.app`.

## Custom domain — `help.biolovers.site`

1. Mintlify dashboard → **Settings → Custom Domain** → add `help.biolovers.site`.
2. Mintlify returns a `CNAME` target (e.g. `cname.mintlify-dns.com`).
3. In the DNS provider for `biolovers.site`:
   - **Type:** `CNAME`
   - **Name:** `help`
   - **Target:** the value Mintlify gave you
   - **Proxy:** **DNS only** (orange cloud OFF on Cloudflare). Mintlify terminates TLS itself.
4. Hit **Verify** in the Mintlify dashboard. SSL is auto-provisioned.

## Updating content

Push to `main`. Mintlify auto-rebuilds on every push. Pull requests get their own preview URL automatically.

## Don't commit secrets

API keys, deploy hooks, and custom-domain tokens live only in the Mintlify dashboard. Nothing in this repo should ever require an environment variable.
