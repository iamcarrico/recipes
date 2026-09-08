import { parseIngredients, parseServings, ingredientLines } from './lib/ingredients.js';
import { formatAmount, formatQuantity } from './src/assets/js/quantity.js';

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets/css': 'assets/css' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/js': 'assets/js' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/images': 'assets/images' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/icons': 'assets/icons' });
  // Cloudflare Pages reads headers from a file at the site root.
  eleventyConfig.addPassthroughCopy({ '_headers': '_headers' });

  // Sass is compiled by its own npm script; watch the output so `eleventy
  // --serve` reloads when styles change.
  eleventyConfig.addWatchTarget('src/assets/css/');

  eleventyConfig.addFilter('parseIngredients', parseIngredients);
  eleventyConfig.addFilter('parseServings', parseServings);
  eleventyConfig.addFilter('ingredientLines', ingredientLines);
  eleventyConfig.addFilter('formatAmount', formatAmount);
  eleventyConfig.addFilter('formatQuantity', formatQuantity);

  /** Lower-cased blob of searchable text, used by the client-side filter. */
  eleventyConfig.addFilter('searchHaystack', (recipe) => {
    const data = recipe.data ?? recipe;
    return [
      data.title,
      data.description,
      data.source,
      ...(data.tags ?? []),
      ...ingredientLines(data.ingredients)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
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

  eleventyConfig.addFilter('jsonLd', (value) =>
    JSON.stringify(value).replace(/</g, '\\u003c')
  );

  /** Every recipe, newest first. */
  eleventyConfig.addCollection('recipes', (collectionApi) =>
    collectionApi
      .getFilteredByGlob('src/recipes/*.md')
      .sort((a, b) => a.data.title.localeCompare(b.data.title))
  );

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
