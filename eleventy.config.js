import MarkdownIt from 'markdown-it';
import { parseIngredients, parseServings, ingredientLines } from './lib/ingredients.js';
import { parseDirections } from './lib/directions.js';
import { recipeSchema } from './lib/schema.js';
import { stripMarkdown } from './lib/sections.js';
import { timerize } from './lib/timers.js';
import { validateRecipeFile } from './lib/validate.js';
import allowedTags from './src/_data/tags.js';
import { foldForSearch } from './src/assets/js/text.js';
import { formatAmount, formatQuantity } from './src/assets/js/quantity.js';

// Inline formatting inside ingredient and step strings. Raw HTML stays escaped.
const inlineMarkdown = new MarkdownIt({ html: false, linkify: false, typographer: false });

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets/css': 'assets/css' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/js': 'assets/js' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/images': 'assets/images' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/icons': 'assets/icons' });
  eleventyConfig.addPassthroughCopy({ 'src/favicon.ico': 'favicon.ico' });

  // Sass is compiled by its own npm script; watch the output so `eleventy
  // --serve` reloads when styles change.
  eleventyConfig.addWatchTarget('src/assets/css/');

  eleventyConfig.addFilter('parseIngredients', parseIngredients);
  eleventyConfig.addFilter('parseServings', parseServings);
  eleventyConfig.addFilter('ingredientLines', ingredientLines);
  eleventyConfig.addFilter('parseDirections', parseDirections);
  eleventyConfig.addFilter('inlineMarkdown', (text) => inlineMarkdown.renderInline(String(text ?? '')));
  eleventyConfig.addFilter('recipeSchema', recipeSchema);
  eleventyConfig.addFilter('timerize', timerize);
  eleventyConfig.addFilter('formatAmount', formatAmount);
  eleventyConfig.addFilter('formatQuantity', formatQuantity);

  /** Folded blob of searchable text, used by the client-side filter. */
  eleventyConfig.addFilter('searchHaystack', (recipe) => {
    const data = recipe.data ?? recipe;
    const text = [
      data.title,
      data.description,
      data.source,
      ...(data.tags ?? []),
      ...ingredientLines(data.ingredients)
    ]
      .filter(Boolean)
      .map(stripMarkdown)
      .join(' ');
    return foldForSearch(text);
  });

  /** YYYY-MM-DD, whether YAML handed us a string or (unquoted) a Date. */
  eleventyConfig.addFilter('isoDate', (value) => {
    if (!value) return '';
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
    const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  });

  eleventyConfig.addFilter('readableDate', (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  });

  /** App shell for the service worker: pages and files the app can't open without. */
  eleventyConfig.addFilter('precacheCore', (assets) => [
    '/',
    '/offline/',
    '/manifest.webmanifest',
    '/favicon.ico',
    ...assets
  ]);

  /** Every recipe page plus its photo, for offline use. */
  eleventyConfig.addFilter('precacheRecipes', (recipes) => [
    ...new Set(recipes.flatMap((recipe) => [recipe.url, recipe.data.image].filter(Boolean)))
  ]);

  /**
   * Every recipe, A–Z. Also where the recipe files are checked: any problem
   * stops the build with a list of what to fix.
   */
  eleventyConfig.addCollection('recipes', (collectionApi) => {
    const recipes = collectionApi.getFilteredByGlob('src/recipes/*.md');

    const problems = [];
    for (const recipe of recipes) {
      const { errors, warnings } = validateRecipeFile(recipe.inputPath, { tags: allowedTags, root: 'src' });
      for (const warning of warnings) console.warn(`[recipes] ${recipe.inputPath}: ${warning}`);
      for (const error of errors) problems.push(`  ${recipe.inputPath}: ${error}`);
    }
    if (problems.length) {
      throw new Error(`Recipe files need fixing:\n${problems.join('\n')}`);
    }

    return recipes.sort((a, b) => a.data.title.localeCompare(b.data.title));
  });

  /** Tags in use, with a count, most common first. */
  eleventyConfig.addCollection('recipeTags', (collectionApi) => {
    const counts = new Map();
    for (const recipe of collectionApi.getFilteredByGlob('src/recipes/*.md')) {
      for (const tag of recipe.data.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  });

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data'
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    templateFormats: ['njk', 'md', 'html']
  };
}
