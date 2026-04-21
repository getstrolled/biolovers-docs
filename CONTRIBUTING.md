# Contributing

Thanks for helping make the Biolovers docs better. Whether it's a typo, a clearer explanation, a missing screenshot, or a brand-new page — pull requests are appreciated.

## Reporting issues

Spotted something wrong, outdated, or confusing? Open an issue with:

- The page URL (or path under `help.biolovers.site/...`)
- What's wrong
- What you expected to see

If it's a small fix, skip the issue and just open a PR.

## Local setup

```bash
git clone git@github.com:getstrolled/biolovers-docs.git
cd biolovers-docs
npm install
npm run dev
```

Mintlify hot-reloads on save. Before opening a PR:

```bash
npm run broken-links
```

## Style guide

- **Plain English first.** Write like you're explaining to a friend, not pitching a product. No jargon, no marketing fluff.
- **Imperative voice for steps.** _"Click **Save**"_, not _"you can click the Save button"_.
- **One concept per page.** Long pages get split into sections with `##` headings.
- **Always link the dashboard route** when telling someone where to do something, e.g. `[Avatar panel](https://dashboard.biolovers.site/dashboard/edit/media/avatar)`.
- **Real screenshots, never mockups.** Capture the actual dashboard or public profile. No AI-generated imagery.
- **Don't invent features.** If it isn't in the product, it doesn't go in the docs. When in doubt, double-check by clicking through the dashboard.

## File layout

Every article lives in a section folder and becomes a route under that section name:

```
appearance/card-layout.mdx        →  /appearance/card-layout
public-profile/audio-player.mdx   →  /public-profile/audio-player
```

After adding a new page, register it in the relevant `pages` array inside `docs.json` so it shows up in the sidebar.

## Frontmatter

Every MDX file starts with:

```mdx
---
title: "Page title"
description: "One-sentence summary, used as the meta description and search snippet."
keywords: ["search", "terms", "users", "might", "type"]
---
```

`keywords` is optional but helps the search index match colloquial phrases (e.g. `["pfp", "profile picture"]` for the Avatar page).

## Components

Mintlify ships a set of MDX components — full reference at [mintlify.com/docs/components](https://mintlify.com/docs/components). The most-used here:

| Component | Use for |
|-----------|---------|
| `<Steps>` + `<Step>` | Numbered, sequential instructions |
| `<CardGroup>` + `<Card>` | Visual indexes / link grids |
| `<Frame>` | Wrapping screenshots so they get a border + caption |
| `<Note>` / `<Tip>` / `<Warning>` | Side callouts |
| `<Accordion>` | Collapsible sections (advanced details, troubleshooting) |
| `<Tabs>` + `<Tab>` | Showing alternatives (e.g. mobile vs desktop steps) |

## Screenshots

All images live under `images/`. Group them by area:

```
images/dashboard/         dashboard panels
images/profile/           public profile shots
images/comparisons/<x>/   side-by-side option comparisons
images/auth/              login / register / forgot-password
images/money/             checkout, upgrades
```

Wrap them in `<Frame>` so they get a consistent border and aren't blown up to full width:

```mdx
<Frame caption="The Avatar panel.">
  <img src="/images/dashboard/media-avatar.png" alt="Avatar panel in the dashboard" />
</Frame>
```

## Pull requests

1. Fork or branch.
2. Make the change. Run `npm run dev` and click through your edit locally.
3. Run `npm run broken-links`.
4. Open a PR. Mintlify will post a preview URL automatically — verify the page renders cleanly there before requesting review.

Small PRs ship faster than big ones. If you're rewriting a whole section, open an issue first to align on direction.

## Questions

Open a ticket in our [Discord](https://biolovers.site/discord) or use our [contact form](https://biolovers.site/contact).
