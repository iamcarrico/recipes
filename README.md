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

Both pick up the caching and security headers (`netlify.toml` for Netlify,
`_headers` for Cloudflare).

## Notes on the frontend

There's no JavaScript framework and no CSS framework. Search filters the cards
already in the DOM rather than fetching an index, and mirrors the query and
selected tags into the URL so a filtered view can be shared. Tag filters
combine with AND — picking `vegetarian` and `baking` shows recipes that are
both.

Every page renders fully without JavaScript; the search box and scale buttons
are the only things that need it.
