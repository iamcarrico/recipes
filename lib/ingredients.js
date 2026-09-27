/**
 * Turns the plain-text ingredient lines stored in a recipe's front matter into
 * structured records the templates can render with scalable quantities.
 */

import { parseAmount } from '../src/assets/js/quantity.js';
import { toSections, stripMarkdown } from './sections.js';

/**
 * @typedef {object} Ingredient
 * @property {number|null} quantity
 * @property {number|null} quantityMax
 * @property {string} unit
 * @property {string} name
 * @property {string} raw
 */

/**
 * Ingredients grouped into sections ("Shortcake", "Topping").
 * @param {unknown[]} lines
 * @returns {Array<{title: string|null, items: Ingredient[]}>}
 */
export function parseIngredients(lines = []) {
  // "2 cups:" is an odd ingredient, but it is still an ingredient.
  return toSections(lines, parseIngredientLine, (line) => !parseAmount(line));
}

/**
 * Ingredient lines as plain text with headings removed, for search and
 * structured data.
 * @param {unknown[]} lines
 * @returns {string[]}
 */
export function ingredientLines(lines = []) {
  return parseIngredients(lines).flatMap((section) =>
    section.items.map((item) => stripMarkdown(item.raw))
  );
}

/**
 * @param {string} line
 * @returns {Ingredient}
 */
export function parseIngredientLine(line) {
  const amount = parseAmount(line);

  if (!amount) {
    return { quantity: null, quantityMax: null, unit: '', name: line, raw: line };
  }

  return {
    quantity: amount.quantity,
    quantityMax: amount.quantityMax,
    unit: amount.unit,
    name: amount.rest,
    raw: line
  };
}

/**
 * Parse a free-text serving yield ("4 to 6", "Makes 12 cookies") into something
 * scalable. The words around the number are preserved verbatim.
 * @param {string|number} servings
 * @returns {{quantity: number|null, quantityMax: number|null, unit: string, suffix: string, raw: string}|null}
 */
export function parseServings(servings) {
  if (servings == null || servings === '') return null;

  const raw = String(servings).trim();
  // "Makes 12 cookies" — keep the lead-in, scale the number.
  const lead = raw.match(/^([A-Za-z\s]*?)\s*(?=\d|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/);
  const prefix = lead ? lead[1].trim() : '';
  const numeric = prefix ? raw.slice(lead[0].length) : raw;

  const amount = parseAmount(numeric);
  if (!amount) return { quantity: null, quantityMax: null, unit: '', suffix: '', raw };

  return {
    quantity: amount.quantity,
    quantityMax: amount.quantityMax,
    unit: amount.unit,
    prefix,
    suffix: amount.rest.trim(),
    raw
  };
}

const YIELD_WORDS = /^(serves|makes|yields?)$/i;

/**
 * Label and text for showing a yield. A leading "Serves", "Makes" or "Yield"
 * becomes the label ("Serves" / "8"), so it isn't doubled up as
 * "Yield: Serves 8"; anything else is labelled "Yield".
 * @param {string|number} servings
 * @returns {{label: string, text: string, usesPrefix: boolean}|null}
 */
export function yieldLabel(servings) {
  const parsed = parseServings(servings);
  if (!parsed) return null;

  const prefix = parsed.prefix ?? '';
  if (!YIELD_WORDS.test(prefix)) return { label: 'Yield', text: parsed.raw, usesPrefix: false };

  return {
    label: prefix[0].toUpperCase() + prefix.slice(1).toLowerCase(),
    text: parsed.raw.slice(parsed.raw.indexOf(prefix) + prefix.length).trim(),
    usesPrefix: true
  };
}
