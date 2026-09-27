/**
 * Build-time checks on recipe front matter, so a typo fails the build with a
 * clear message instead of quietly rendering an empty recipe.
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { toLine } from './sections.js';

const FIELDS = {
  title: 'text',
  description: 'text',
  tags: 'list',
  servings: 'text-or-number',
  prepTime: 'text',
  cookTime: 'text',
  totalTime: 'text',
  difficulty: 'text',
  rating: 'rating',
  image: 'image',
  imageAlt: 'text',
  source: 'text',
  sourceUrl: 'url',
  created: 'date',
  nutrition: 'text',
  ingredients: 'lines',
  directions: 'lines',
  // Eleventy's own keys, in case a recipe needs them.
  layout: 'text',
  permalink: 'any',
  eleventyExcludeFromCollections: 'any'
};

const REQUIRED = ['title', 'ingredients', 'directions'];

/**
 * @param {string} filePath a recipe markdown file
 * @param {{tags: string[], root?: string}} options root is the input directory, for image paths
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validateRecipeFile(filePath, { tags, root = 'src' }) {
  let data;
  try {
    data = readFrontMatter(filePath);
  } catch (error) {
    return { errors: [`front matter is not valid YAML: ${error.message.split('\n')[0]}`], warnings: [] };
  }
  return validateRecipe(data, { tags, root });
}

/**
 * @param {Record<string, unknown>} data parsed front matter
 * @param {{tags: string[], root?: string}} options
 */
export function validateRecipe(data, { tags, root = 'src' }) {
  const errors = [];
  const warnings = [];

  for (const field of REQUIRED) {
    if (data[field] == null || data[field] === '' || (Array.isArray(data[field]) && data[field].length === 0)) {
      errors.push(`${field}: required`);
    }
  }

  for (const [field, value] of Object.entries(data)) {
    const kind = FIELDS[field];
    if (!kind) {
      const guess = closest(field, Object.keys(FIELDS));
      errors.push(`${field}: unknown field${guess ? ` (did you mean "${guess}"?)` : ''}`);
      continue;
    }
    if (value == null) continue;
    const problem = checkValue(kind, value, { root });
    if (problem) errors.push(`${field}: ${problem}`);
  }

  if (Array.isArray(data.tags)) {
    for (const tag of data.tags) {
      if (typeof tag !== 'string' || tags.includes(tag)) continue;
      const guess = tags.find((known) => known.toLowerCase() === tag.toLowerCase()) ?? closest(tag, tags);
      errors.push(
        `tags: "${tag}" is not one of ${tags.join(', ')}${guess ? ` (did you mean "${guess}"?)` : ''}`
      );
    }
    if (data.tags.length === 0) warnings.push('tags: none yet, so it only shows up unfiltered');
  }

  return { errors, warnings };
}

function checkValue(kind, value, { root }) {
  switch (kind) {
    case 'text':
      return typeof value === 'string' ? null : 'should be text';
    case 'text-or-number':
      return typeof value === 'string' || typeof value === 'number' ? null : 'should be text or a number';
    case 'list':
      if (!Array.isArray(value)) return 'should be a list';
      return value.every((item) => typeof item === 'string' && item.trim()) ? null : 'every entry should be text';
    case 'lines':
      if (!Array.isArray(value)) return 'should be a list';
      return value.every((item) => toLine(item)) ? null : 'has an empty entry';
    case 'rating':
      return typeof value === 'number' && value >= 0 && value <= 5 ? null : 'should be a number from 0 to 5';
    case 'url':
      try {
        const url = new URL(String(value));
        return url.protocol === 'http:' || url.protocol === 'https:' ? null : 'should be an http(s) link';
      } catch {
        return 'is not a valid link';
      }
    case 'date': {
      const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
      // Round-trip, so 2024-02-30 doesn't pass as March 1st.
      const parsed = new Date(`${text}T00:00:00Z`);
      return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(text)
        ? null
        : 'should be a real date like 2024-11-28';
    }
    case 'image':
      if (typeof value !== 'string' || !value.startsWith('/')) return 'should be a site path like /assets/images/recipes/pie.jpg';
      return existsSync(path.join(root, value)) ? null : `no file at ${path.join(root, value)}`;
    default:
      return null;
  }
}

function readFrontMatter(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  // CORE_SCHEMA leaves dates as text. The default schema would turn an
  // unquoted 2024-13-45 into a real (rolled-over) date and hide the typo.
  return yaml.load(match[1], { schema: yaml.CORE_SCHEMA }) ?? {};
}

/** A likely intended word: same letters give or take two edits. */
function closest(word, candidates) {
  let best = null;
  let bestDistance = 3;
  for (const candidate of candidates) {
    const distance = editDistance(word.toLowerCase(), candidate.toLowerCase());
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}
