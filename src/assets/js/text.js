/**
 * Text folding for search, shared by the build (which writes each card's
 * search text) and the browser (which folds the query the same way).
 */

/**
 * Lower-case and strip accents, so "creme" finds "crème" and "jalapeno"
 * finds "jalapeño".
 * @param {string} text
 * @returns {string}
 */
export function foldForSearch(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}
