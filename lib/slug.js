/**
 * Filename-safe slug. Deliberately conservative: ASCII, lowercase, hyphens.
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 80) || 'recipe';
}
