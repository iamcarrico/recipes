/**
 * Turns the plain-text ingredient lines stored in a recipe's front matter into
 * structured records the templates can render with scalable quantities.
 */

import { parseAmount } from '../src/assets/js/quantity.js';

/**
 * @typedef {object} IngredientHeading
 * @property {'heading'} type
 * @property {string} text
 *
 * @typedef {object} Ingredient
 * @property {'ingredient'} type
 * @property {number|null} quantity
 * @property {number|null} quantityMax
 * @property {string} unit
 * @property {string} name
 * @property {string} raw
 */

/**
 * @param {string[]} lines
 * @returns {Array<Ingredient|IngredientHeading>}
 */
export function parseIngredients(lines = []) {
  return lines
    .map((line) => String(line ?? '').trim())
    .filter(Boolean)
    .map(parseIngredientLine);
}

/**
 * @param {string} line
 * @returns {Ingredient|IngredientHeading}
 */
export function parseIngredientLine(line) {
  const amount = parseAmount(line);

  // A short, quantity-free line ending in a colon is a section label
  // ("For the sauce:"), not something to buy.
  if (!amount && /:\s*$/.test(line)) {
    return { type: 'heading', text: line.replace(/:\s*$/, '') };
  }

  if (!amount) {
    return {
      type: 'ingredient',
      quantity: null,
      quantityMax: null,
      unit: '',
      name: line,
      raw: line
    };
  }

  return {
    type: 'ingredient',
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
