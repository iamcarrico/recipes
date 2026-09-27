/**
 * Reduce a free-text nutrition block to the macros.
 *
 * Paprika and recipe sites publish nutrition in several shapes — "Calories 512",
 * "Calories: 403", full US Nutrition Facts labels — often padded with diet
 * labels ("fish-free"), vitamins, and footnotes. Only the lines below are kept,
 * each exactly as written, in this order. Everything else is dropped.
 */

const MACROS = [
  { name: 'calories', pattern: /^calories\b/i },
  { name: 'fat', pattern: /^(total\s+)?fat\b/i },
  { name: 'saturated fat', pattern: /^saturated(\s+fat)?\b/i },
  { name: 'carbohydrates', pattern: /^(total\s+)?carb(s|ohydrates?)\b/i },
  { name: 'fiber', pattern: /^(dietary\s+)?fib(er|re)\b/i },
  { name: 'sugar', pattern: /^(total\s+)?sugars?\b/i },
  { name: 'protein', pattern: /^protein\b/i }
];

/**
 * @param {string|undefined} text
 * @returns {string|undefined} the macro lines, or undefined if none were found
 */
export function macrosOnly(text) {
  const lines = String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const kept = MACROS.map(({ pattern }) =>
    // A label with no number after it is a heading, not a value.
    lines.find((line) => pattern.test(line) && /\d/.test(line))
  ).filter(Boolean);

  return kept.length ? kept.join('\n') : undefined;
}
