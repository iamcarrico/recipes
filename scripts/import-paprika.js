#!/usr/bin/env node
/**
 * Convert Paprika exports into recipe markdown files.
 *
 *   npm run import -- _sample_data/*.paprikarecipes
 *   npm run import -- ~/Downloads/All\ Recipes.paprikarecipes --force
 *   npm run import -- _sample_data --dry-run
 *
 * The markdown is the source of truth once written: re-importing skips files
 * that already exist unless --force is passed, so hand edits survive.
 */

import { mkdir, readdir, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

import { readPaprikaFile, splitSteps, splitLines, imageExtension } from '../lib/paprika.js';
import { slugify } from '../lib/slug.js';
import { macrosOnly } from '../lib/nutrition.js';
import allowedTags from '../src/_data/allowedTags.js';

const RECIPE_DIR = 'src/recipes';
const IMAGE_DIR = 'src/assets/images/recipes';
const IMAGE_URL_BASE = '/assets/images/recipes';
const PAPRIKA_EXTENSIONS = new Set(['.paprikarecipes', '.paprikarecipe']);

async function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help || options.inputs.length === 0) {
    printUsage();
    process.exit(options.help ? 0 : 1);
  }

  const files = await collectFiles(options.inputs);
  if (files.length === 0) {
    console.error('No Paprika export files found in the given paths.');
    process.exit(1);
  }

  if (!options.dryRun) {
    await mkdir(options.recipeDir, { recursive: true });
    await mkdir(options.imageDir, { recursive: true });
  }

  const summary = { written: 0, skipped: 0, failed: 0 };

  for (const file of files) {
    let recipes;
    try {
      recipes = await readPaprikaFile(file);
    } catch (error) {
      console.error(`✗ ${path.basename(file)}: ${error.message}`);
      summary.failed += 1;
      continue;
    }

    for (const recipe of recipes) {
      try {
        const result = await importRecipe(recipe, options);
        summary[result.status] += 1;
        console.log(result.message);
      } catch (error) {
        summary.failed += 1;
        console.error(`✗ ${recipe?.name ?? 'unnamed recipe'}: ${error.message}`);
      }
    }
  }

  console.log(
    `\n${summary.written} written, ${summary.skipped} skipped, ${summary.failed} failed` +
      (options.dryRun ? ' (dry run — nothing was saved)' : '')
  );

  if (summary.failed > 0) process.exit(1);
}

/**
 * @param {object} recipe raw Paprika recipe
 * @param {object} options
 */
async function importRecipe(recipe, options) {
  const title = String(recipe.name ?? '').trim();
  if (!title) throw new Error('recipe has no name');

  const slug = slugify(title);
  const markdownPath = path.join(options.recipeDir, `${slug}.md`);

  if (existsSync(markdownPath) && !options.force) {
    return { status: 'skipped', message: `· ${title} — already imported (use --force to overwrite)` };
  }

  const image = await saveImage(recipe, slug, options);

  const { tags, unmatched } = matchTags(recipe.categories);
  const frontMatter = buildFrontMatter(recipe, { title, image, tags });
  const body = String(recipe.notes ?? '').replace(/\r\n/g, '\n').trim();
  const document = `---\n${yaml.dump(frontMatter, { lineWidth: -1, noRefs: true })}---\n\n${body ? `${body}\n` : ''}`;

  if (!options.dryRun) {
    await writeFile(markdownPath, document, 'utf8');
  }

  const note = unmatched.length
    ? ` (Paprika categories not in the tag list, left off: ${unmatched.join(', ')})`
    : '';
  return { status: 'written', message: `✓ ${title} → ${markdownPath}${note}` };
}

/** Build the YAML front matter, omitting anything Paprika left blank. */
function buildFrontMatter(recipe, { title, image, tags }) {
  const ingredients = splitLines(recipe.ingredients);
  const directions = splitSteps(recipe.directions);

  const data = {
    title,
    description: clean(recipe.description),
    tags,
    servings: clean(recipe.servings),
    prepTime: clean(recipe.prep_time),
    cookTime: clean(recipe.cook_time),
    totalTime: clean(recipe.total_time),
    difficulty: clean(recipe.difficulty),
    rating: Number(recipe.rating) > 0 ? Number(recipe.rating) : undefined,
    image: image?.url,
    imageAlt: image ? title : undefined,
    source: clean(recipe.source),
    sourceUrl: clean(recipe.source_url),
    created: clean(recipe.created)?.slice(0, 10),
    // Only the macros; diet labels, sodium, vitamins and footnotes are dropped.
    nutrition: macrosOnly(recipe.nutritional_info),
    ingredients,
    directions
  };

  for (const [key, value] of Object.entries(data)) {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0 && key !== 'tags');
    if (isEmpty) delete data[key];
  }

  return data;
}

/**
 * Keep Paprika categories that match the site's tag list (any capitalisation)
 * and report the rest, so an import never introduces a tag the build rejects.
 */
function matchTags(categories) {
  const tags = [];
  const unmatched = [];
  for (const category of Array.isArray(categories) ? categories : []) {
    const name = String(category ?? '').trim();
    if (!name) continue;
    const known = allowedTags.find((tag) => tag.toLowerCase() === name.toLowerCase());
    if (known && !tags.includes(known)) tags.push(known);
    else if (!known) unmatched.push(name);
  }
  return { tags, unmatched };
}

/** Write the embedded photo to disk and return its public URL. */
async function saveImage(recipe, slug, options) {
  if (!recipe.photo_data) return null;

  let buffer;
  try {
    buffer = Buffer.from(recipe.photo_data, 'base64');
  } catch {
    return null;
  }

  const extension = imageExtension(buffer);
  if (!extension) {
    console.warn(`  ! ${recipe.name}: embedded photo is not a recognised image, skipping it`);
    return null;
  }

  const filename = `${slug}${extension}`;
  if (!options.dryRun) {
    await writeFile(path.join(options.imageDir, filename), buffer);
  }

  return { url: `${IMAGE_URL_BASE}/${filename}` };
}

function clean(value) {
  const text = String(value ?? '').replace(/\r\n/g, '\n').trim();
  return text || undefined;
}

/** Expand directories into the Paprika files they contain. */
async function collectFiles(inputs) {
  const files = [];

  for (const input of inputs) {
    let info;
    try {
      info = await stat(input);
    } catch {
      console.error(`✗ ${input}: no such file or directory`);
      continue;
    }

    if (info.isDirectory()) {
      const entries = await readdir(input, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && PAPRIKA_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          files.push(path.join(input, entry.name));
        }
      }
      continue;
    }

    files.push(input);
  }

  return files;
}

function parseArguments(argv) {
  const options = {
    inputs: [],
    recipeDir: RECIPE_DIR,
    imageDir: IMAGE_DIR,
    force: false,
    dryRun: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    switch (argument) {
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--dry-run':
      case '-n':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--out':
        options.recipeDir = argv[index + 1] ?? RECIPE_DIR;
        index += 1;
        break;
      case '--images':
        options.imageDir = argv[index + 1] ?? IMAGE_DIR;
        index += 1;
        break;
      default:
        if (argument.startsWith('-')) {
          console.error(`Unknown option "${argument}".`);
          options.help = true;
        } else {
          options.inputs.push(argument);
        }
    }
  }

  return options;
}

function printUsage() {
  console.log(`
Import Paprika recipes into ${RECIPE_DIR}/

  npm run import -- <file-or-directory>... [options]

Options
  -f, --force       overwrite recipes that have already been imported
  -n, --dry-run     report what would happen without writing anything
      --out DIR     write markdown somewhere other than ${RECIPE_DIR}
      --images DIR  save photos somewhere other than ${IMAGE_DIR}
  -h, --help        show this message

Accepts .paprikarecipes bundles, single .paprikarecipe files, or a directory
containing either.
`.trim());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
