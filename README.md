# biolovers docs

Source for **[help.biolovers.site](https://help.biolovers.site)** — the official help center for [biolovers.site](https://biolovers.site).

Built with [Mintlify](https://mintlify.com). Pushes to `main` deploy automatically.

## Quick start

```bash
npm install
npm run dev
```

Local preview at <http://localhost:3000>. If the `mint` CLI isn't installed:

```bash
npm i -g mint
```

## Project layout

```
.
├── docs.json              Sidebar, theme, navbar, footer
├── index.mdx              Landing page
├── images/                Screenshots referenced from MDX
└── <section>/<page>.mdx   One file per article
```

Every page declares its title, description, and (optionally) search keywords in YAML frontmatter:

```mdx
---
title: "Card layout"
description: "Pick how your bio card is shaped — Default, Modern, Simplistic, Sleek."
keywords: ["layout", "card", "shape"]
---
```

## Validate before pushing

```bash
npm run broken-links
```

## Contributing

Improvements, fixes, and new pages are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Deployment

See [DEPLOY.md](./DEPLOY.md) for Mintlify project + custom domain setup.

## License

Documentation content © Biolovers. All rights reserved.
