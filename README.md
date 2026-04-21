# Biolovers docs

Source for the [Biolovers](https://biolovers.site) help center, published at **[help.biolovers.site](https://help.biolovers.site)**.

Built with [Mintlify](https://mintlify.com/). Mintlify hosts the rendered site and rebuilds on every push to `main`.

## Local preview

```bash
npm install
npm run dev
```

That runs `mint dev` on port `3000`.

If `mint` complains it isn't installed, install the global CLI once:

```bash
npm i -g mint
```

## Check for broken links

```bash
npm run broken-links
```

## Editing content

| Path | What it is |
|------|------------|
| `docs.json` | Sidebar, theme colors, navbar/footer, search prompt. |
| `index.mdx` | Landing page. |
| `<group>/<page>.mdx` | One MDX per article — frontmatter `title`, `description`, optional `keywords`. |
| `images/` | Real screenshots from the running dev server (no AI-generated images). |
| `scripts/` | Puppeteer helpers used to refresh the screenshots from a local dev session. |

Push to `main` and Mintlify auto-rebuilds. PRs get a preview URL.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the custom domain + Mintlify project setup.
