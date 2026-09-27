/**
 * Quantity parsing, formatting and unit handling.
 *
 * This module is imported by the Eleventy build (to parse ingredient lines into
 * structured data) *and* by the browser (to re-render those quantities when the
 * serving multiplier changes). Keep it dependency-free and free of any Node or
 * DOM globals so both consumers can use it unchanged.
 */

/** Single-character fractions that show up in pasted recipes. */
const UNICODE_FRACTIONS = {
  '½': 1 / 2,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 1 / 4,
  '¾': 3 / 4,
  '⅕': 1 / 5,
  '⅖': 2 / 5,
  '⅗': 3 / 5,
  '⅘': 4 / 5,
  '⅙': 1 / 6,
  '⅚': 5 / 6,
  '⅛': 1 / 8,
  '⅜': 3 / 8,
  '⅝': 5 / 8,
  '⅞': 7 / 8
};

const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join('');

/** A number: mixed fraction, plain fraction, decimal, integer, or unicode fraction. */
const NUMBER = `(?:\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d+(?:\\.\\d+)?\\s*[${FRACTION_CHARS}]?|[${FRACTION_CHARS}])`;

/** Separators used for ranges: "2 to 3", "2-3", "2 – 3". */
const RANGE = '\\s*(?:-|\\u2013|\\u2014|to|or)\\s*';

const LEADING_QUANTITY = new RegExp(`^\\s*(${NUMBER})(?:${RANGE}(${NUMBER}))?`, 'i');

/**
 * Units we know how to pluralise. Abbreviations are deliberately absent —
 * "2 tsp" is correct and "2 tsps" is not.
 */
const UNITS = [
  ['cup', 'cups'],
  ['tablespoon', 'tablespoons'],
  ['teaspoon', 'teaspoons'],
  ['pound', 'pounds'],
  ['ounce', 'ounces'],
  ['gram', 'grams'],
  ['kilogram', 'kilograms'],
  ['milliliter', 'milliliters'],
  ['millilitre', 'millilitres'],
  ['liter', 'liters'],
  ['litre', 'litres'],
  ['quart', 'quarts'],
  ['pint', 'pints'],
  ['gallon', 'gallons'],
  ['clove', 'cloves'],
  ['can', 'cans'],
  ['jar', 'jars'],
  ['package', 'packages'],
  ['pinch', 'pinches'],
  ['dash', 'dashes'],
  ['slice', 'slices'],
  ['stick', 'sticks'],
  ['sprig', 'sprigs'],
  ['stalk', 'stalks'],
  ['head', 'heads'],
  ['bunch', 'bunches'],
  ['piece', 'pieces'],
  ['strip', 'strips'],
  ['fillet', 'fillets'],
  ['breast', 'breasts'],
  ['thigh', 'thighs'],
  ['egg', 'eggs'],
  ['drop', 'drops'],
  ['handful', 'handfuls'],
  ['leaf', 'leaves'],
  ['ear', 'ears'],
  ['rib', 'ribs'],
  ['sheet', 'sheets'],
  ['bottle', 'bottles'],
  ['container', 'containers'],
  // Whole items, for yields like "1 cake (three 9-inch layers)".
  ['cake', 'cakes'],
  ['pie', 'pies'],
  ['loaf', 'loaves'],
  ['batch', 'batches']
];

const UNIT_LOOKUP = new Map();
for (const [singular, plural] of UNITS) {
  UNIT_LOOKUP.set(singular, { singular, plural });
  UNIT_LOOKUP.set(plural, { singular, plural });
}

/** Longest unit phrase is two words ("fluid ounces"), so we peek at two tokens. */
const UNIT_PREFIXES = ['fluid', 'fl'];

/**
 * Turn a numeric token ("1 1/2", "3/4", "0.5", "½") into a number.
 * @param {string} token
 * @returns {number|null}
 */
export function parseNumber(token) {
  if (!token) return null;
  // "1 1/ 2" and "3 / 4" are typos worth tolerating, not reasons to skip scaling.
  const text = String(token).trim().replace(/\s*\/\s*/g, '/');
  if (!text) return null;

  let total = 0;
  let matched = false;

  // Split off a trailing unicode fraction so "1½" works as well as "1 1/2".
  const unicodeMatch = text.match(new RegExp(`([${FRACTION_CHARS}])\\s*$`));
  let remainder = text;
  if (unicodeMatch) {
    total += UNICODE_FRACTIONS[unicodeMatch[1]];
    matched = true;
    remainder = text.slice(0, unicodeMatch.index).trim();
  }

  if (remainder) {
    for (const part of remainder.split(/\s+/)) {
      const fraction = part.match(/^(\d+)\s*\/\s*(\d+)$/);
      if (fraction) {
        const denominator = Number(fraction[2]);
        if (denominator === 0) return null;
        total += Number(fraction[1]) / denominator;
        matched = true;
        continue;
      }
      if (/^\d+(?:\.\d+)?$/.test(part)) {
        total += Number(part);
        matched = true;
        continue;
      }
      return null;
    }
  }

  return matched ? total : null;
}

/**
 * Render a number the way a cook would write it: "1 1/2", not "1.5".
 * @param {number} value
 * @returns {string}
 */
export function formatQuantity(value) {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '0';

  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute + 1e-9);
  const remainder = absolute - whole;

  if (remainder < 1e-6) return `${sign}${whole}`;

  // Prefer the friendliest denominator that lands within a half-percent.
  for (const denominator of [2, 3, 4, 8, 16]) {
    const numerator = Math.round(remainder * denominator);
    if (numerator === 0 || numerator >= denominator) continue;
    if (Math.abs(remainder - numerator / denominator) < 0.005) {
      const divisor = greatestCommonDivisor(numerator, denominator);
      const fraction = `${numerator / divisor}/${denominator / divisor}`;
      return whole > 0 ? `${sign}${whole} ${fraction}` : `${sign}${fraction}`;
    }
  }

  // Nothing tidy fits — fall back to a short decimal.
  return `${sign}${Number(absolute.toFixed(2))}`;
}

/**
 * Pick the singular or plural form of a unit for a given amount.
 * Unrecognised units are returned exactly as written.
 * @param {string} unit
 * @param {number} value
 * @returns {string}
 */
export function formatUnit(unit, value) {
  if (!unit) return '';
  const forms = UNIT_LOOKUP.get(unit.toLowerCase());
  if (!forms) return unit;

  // Recipes write amounts of one or less in the singular: "1/2 pound", not
  // "1/2 pounds".
  const target = value > 0 && value <= 1 + 1e-9 ? forms.singular : forms.plural;
  return matchCapitalisation(unit, target);
}

/**
 * Format a whole amount — quantity, optional range, and unit — as display text.
 * @param {{quantity: number|null, quantityMax?: number|null, unit?: string}} amount
 * @param {number} [multiplier]
 * @returns {string}
 */
export function formatAmount(amount, multiplier = 1) {
  if (!amount || amount.quantity == null) return '';

  const low = amount.quantity * multiplier;
  const high = amount.quantityMax == null ? null : amount.quantityMax * multiplier;

  const number = high == null
    ? formatQuantity(low)
    : `${formatQuantity(low)} to ${formatQuantity(high)}`;

  const unit = formatUnit(amount.unit, high == null ? low : high);
  return unit ? `${number} ${unit}` : number;
}

/**
 * Pull a leading quantity (and its unit) off the front of a string.
 * @param {string} text
 * @returns {{quantity: number, quantityMax: number|null, unit: string, rest: string}|null}
 */
export function parseAmount(text) {
  if (!text) return null;

  const match = String(text).match(LEADING_QUANTITY);
  if (!match) return null;

  const quantity = parseNumber(match[1]);
  if (quantity == null) return null;

  const quantityMax = match[2] ? parseNumber(match[2]) : null;
  let rest = String(text).slice(match[0].length).replace(/^\s+/, '');

  const { unit, rest: withoutUnit } = takeUnit(rest);
  rest = withoutUnit;

  return {
    quantity,
    quantityMax: quantityMax != null && quantityMax !== quantity ? quantityMax : null,
    unit,
    rest
  };
}

/** Consume a known unit from the front of a string, if one is there. */
function takeUnit(text) {
  const tokens = text.match(/^([A-Za-z.]+)(\s+|$)/);
  if (!tokens) return { unit: '', rest: text };

  const word = tokens[1].replace(/\.$/, '');
  const remainder = text.slice(tokens[0].length);

  // Two-word units such as "fluid ounces".
  if (UNIT_PREFIXES.includes(word.toLowerCase())) {
    const second = remainder.match(/^([A-Za-z.]+)(\s+|$)/);
    if (second && UNIT_LOOKUP.has(second[1].replace(/\.$/, '').toLowerCase())) {
      return {
        unit: `${word} ${second[1].replace(/\.$/, '')}`,
        rest: remainder.slice(second[0].length)
      };
    }
  }

  if (UNIT_LOOKUP.has(word.toLowerCase()) || isAbbreviation(word)) {
    return { unit: word, rest: remainder };
  }

  return { unit: '', rest: text };
}

const ABBREVIATIONS = new Set([
  'c', 'tsp', 'tsps', 'tbsp', 'tbsps', 'tb', 'oz', 'lb', 'lbs',
  'g', 'kg', 'mg', 'ml', 'l', 'qt', 'pt', 'gal', 'pkg'
]);

function isAbbreviation(word) {
  return ABBREVIATIONS.has(word.toLowerCase());
}

function matchCapitalisation(source, target) {
  if (source[0] === source[0].toUpperCase() && source[0] !== source[0].toLowerCase()) {
    return target[0].toUpperCase() + target.slice(1);
  }
  return target;
}

function greatestCommonDivisor(a, b) {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}
