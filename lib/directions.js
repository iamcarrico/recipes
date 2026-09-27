/**
 * Directions, grouped into sections. Steps stay as markdown strings; the
 * template renders their inline formatting.
 */

import { toSections } from './sections.js';

/**
 * @param {unknown[]} lines
 * @returns {Array<{title: string|null, items: string[]}>}
 */
export function parseDirections(lines = []) {
  return toSections(lines, (line) => line);
}
