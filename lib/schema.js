/**
 * schema.org Recipe structured data, so search engines can read the recipe.
 */

import { ingredientLines } from './ingredients.js';
import { parseDirections } from './directions.js';
import { stripMarkdown } from './sections.js';

/**
 * @param {object} data the recipe page's data cascade
 * @param {{author: string, url: string}} site
 */
export function recipeSchema(data, site) {
  const sections = parseDirections(data.directions);
  const toSteps = (steps) =>
    steps.map((text) => ({ '@type': 'HowToStep', text: stripMarkdown(text) }));

  // Only use HowToSection when the recipe actually has named sections.
  const instructions = sections.some((section) => section.title)
    ? sections.map((section) => ({
        '@type': 'HowToSection',
        name: section.title ?? 'Directions',
        itemListElement: toSteps(section.items)
      }))
    : toSteps(sections.flatMap((section) => section.items));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: data.title,
    description: data.description,
    image: data.image ? `${site.url}${data.image}` : undefined,
    author: { '@type': 'Person', name: data.source && !data.sourceUrl ? data.source : site.author },
    recipeYield: data.servings != null ? String(data.servings) : undefined,
    recipeIngredient: ingredientLines(data.ingredients),
    recipeInstructions: instructions,
    keywords: (data.tags ?? []).join(', ') || undefined
  };

  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
