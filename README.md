# Carrico Recipes

A small static site for the recipes we actually cook. Recipes are markdown
files, the build is [Eleventy](https://www.11ty.dev/), the styling is plain
Sass, and the output is a folder of HTML you can host anywhere.

## Getting started

```bash
npm install
npm run dev
```

That serves the site at <http://localhost:8080> and rebuilds as you edit.

| Script | What it does |
| --- | --- |
| `npm run dev` | Local server with live reload |
| `npm run build` | Production build into `_site/` |
| `npm run import` | Import recipes from a Paprika export |
| `npm run icons` | Regenerate the home-screen icons from the favicon |
| `npm run clean` | Delete build output |

## Adding a recipe

Drop a markdown file in `src/recipes/`. The filename becomes the URL, so
`chili.md` is served at `/recipes/chili/`.

```markdown
---
title: Weeknight Chili
description: Thick, smoky, and better the next day.
tags:
  - beef
  - weeknight
servings: 6
prepTime: 15 minutes
cookTime: 1 hour
totalTime: 1 hour 15 minutes
image: /assets/images/recipes/chili.jpg
source: Grandma Carrico
sourceUrl: https://example.com/chili
ingredients:
  - 2 pounds ground beef
  - 1 large onion, diced
  - 2 to 3 tablespoons chili powder
directions:
  - Brown the beef in a heavy pot and drain the fat.
  - Add everything else and simmer for an hour.
---

Anything below the front matter becomes the Notes section. Markdown works here.
```

Only `title`, `ingredients` and `directions` are required. Every other field is
dropped from the page when it's missing.

### Sections

Both `ingredients` and `directions` can be split into sections. A line on its
own that is wholly bold, or short and ending in a colon, becomes a heading:

```yaml
ingredients:
  - '**Shortcake**'
  - 5 cups flour
  - '**Topping**'
  - 1/2 cup sugar
directions:
  - For the shortcake:
  - Preheat the oven to 350.
  - For the topping:
  - Quarter the strawberries.
```

Step numbering restarts at 1 in each section. Bold lines need quotes, because
YAML reads a leading `*` as special. Colon headings don't.

A bold label followed by more text is *not* a heading — `'**Oven**: bake for
25 minutes'` stays a step, with "Oven" in bold. Ingredients and steps support
inline markdown generally (`**bold**`, `*italic*`); raw HTML is escaped.

### Tags

Tags drive the filter buttons on the homepage. They're free-form — whatever you
use shows up automatically, with a count, sorted by how often you use it.

## Importing from Paprika

Export from Paprika (**Recipes → select → Share → Export**) and point the script
at the file:

```bash
npm run import -- ~/Downloads/All\ Recipes.paprikarecipes
```

It writes one markdown file per recipe into `src/recipes/` and saves each
embedded photo into `src/assets/images/recipes/`.

| Flag | Effect |
| --- | --- |
| `--dry-run` | Report what would happen without writing anything |
| `--force` | Overwrite recipes that were already imported |
| `--out DIR` | Write markdown somewhere other than `src/recipes/` |

Imported recipes land **untagged** — Paprika's categories are usually empty, so
tagging is a quick pass by hand afterward. Re-running the import skips files
that already exist, so your edits and tags survive unless you pass `--force`.

## Scaling

Each recipe page has 0.5× / 1× / 2× / 3× buttons. Quantities are parsed at build
time into structured data, so scaling in the browser is arithmetic plus
formatting — and both sides share `src/assets/js/quantity.js`, so a fraction
renders the same way whether it came from the build or from a click.

Ranges scale as ranges (`2 to 3 cups` → `4 to 6 cups`), units follow the number
(`1 pound` → `2 pounds`, `1/2 pound`), and lines with no quantity are left
alone.

**Amounts written into the step text are not scaled.** A step saying "add 1 cup
of the milk" still says that at 2×, so the page shows a notice whenever the
multiplier isn't 1× rather than quietly leaving you to trip over it.

## Project layout

```
src/
  _data/site.js            Site-wide values (title, URL, author)
  _includes/layouts/       Base and recipe page templates
  _includes/partials/      Recipe card
  recipes/                 One markdown file per recipe
  assets/scss/             Tokens, base, layout, components
  assets/js/               quantity.js (shared), search.js, scaler.js
lib/                       Build-time helpers and the Paprika reader
scripts/import-paprika.js  Import CLI
```

## Deploying

The build is a static folder, so any host works.

- **Netlify** — `netlify.toml` is committed; connect the repo and it builds.
- **Cloudflare Pages** — build command `npm run build`, output directory
  `_site`, and set `NODE_VERSION` to `24`.

Both read caching and security headers from `src/_headers`, which is copied
to the root of the build.

## Home-screen app

The site installs as an app. On iPhone: open it in Safari → **Share** →
**Add to Home Screen**. It opens full-screen, with no browser bars.

A service worker saves every recipe and photo on the device when the app is
first opened, so the whole cookbook works with no signal. Online, pages always
come from the network, so edits show up on the next visit; the saved copy is
only used when the network isn't there. Each deploy that changes anything
refreshes the saved copy automatically.

### Icons

The app icons are generated from `src/favicon.ico`:

```bash
npm run icons
```

The hat is 32px, so it's scaled up with hard pixel edges. If you find a larger
original, pass it in for sharper icons (`npm run icons -- path/to/hat.png`) and
commit the results in `src/assets/icons/`.

## Privacy: search engines and AI crawlers

`private: true` in `src/_data/site.js` keeps the site out of search results and
opts it out of AI training. With it on, the build:

- serves a `robots.txt` that disallows every crawler, and names the major AI
  crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, …) explicitly
- adds a `noindex, nofollow, noai, …` robots meta tag to every page and the
  same directives as an `X-Robots-Tag` header
- publishes a TDM-reservation opt-out (`tdm-reservation` header, meta tag, and
  `/.well-known/tdmrep.json`)
- leaves out the schema.org recipe data, which mostly exists for crawlers

These are requests, not locks: reputable crawlers honour them, bad actors
don't. For enforcement, turn on Cloudflare's AI-bot blocking or put the site
behind a password.

Set `private: false` to reverse all of it.

## Notes on the frontend

There's no JavaScript framework and no CSS framework. Search filters the cards
already in the DOM rather than fetching an index, and mirrors the query and
selected tags into the URL so a filtered view can be shared. Tag filters
combine with AND — picking `vegetarian` and `baking` shows recipes that are
both.

Every page renders fully without JavaScript; the search box and scale buttons
are the only things that need it.
