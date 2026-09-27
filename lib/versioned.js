/**
 * Content-fingerprinted URLs for images and icons.
 *
 * Icons and photos are cached for a week (and iOS holds home-screen icons
 * tighter still), so reusing a URL for new artwork serves the old image. A
 * hash of the file in the query string gives every version its own URL.
 */

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const FINGERPRINTED = /\.(png|jpe?g|webp|gif|svg|ico)$/i;
const memo = new Map();

/**
 * @param {string} url a site path such as /assets/icons/logo.png
 * @param {string} [root] the input directory the path maps into
 * @returns {string} the path with ?v=<hash>, or unchanged if not an image or not found
 */
export function versioned(url, root = 'src') {
  if (typeof url !== 'string' || !url.startsWith('/') || !FINGERPRINTED.test(url)) return url;

  const file = path.join(root, url);
  let stats;
  try {
    stats = statSync(file);
  } catch {
    return url;
  }

  // Re-hash only when the file changes, which matters under --serve.
  const key = `${file}:${stats.mtimeMs}:${stats.size}`;
  if (!memo.has(key)) {
    memo.set(key, createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 10));
  }
  return `${url}?v=${memo.get(key)}`;
}
