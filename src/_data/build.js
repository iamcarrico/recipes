/**
 * Build fingerprint and the static assets the service worker should save.
 *
 * The version is a hash of everything under src/, so the service worker file
 * changes — and installed apps refresh their saved copy — only when content
 * or code actually changes.
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(directory, entry.name);
      if (entry.name.startsWith('.')) return [];
      return entry.isDirectory() ? walk(full) : [full];
    })
    .sort();
}

const hash = createHash('sha256');
for (const file of walk('src')) {
  hash.update(file);
  hash.update(readFileSync(file));
}

const toUrl = (file) => `/${path.relative('src', file).split(path.sep).join('/')}`;

export default {
  version: hash.digest('hex').slice(0, 12),
  // Styles, scripts and icons. Recipe photos are added per recipe.
  assets: ['src/assets/css', 'src/assets/js', 'src/assets/icons']
    .flatMap((directory) => {
      try {
        return walk(directory);
      } catch {
        return []; // e.g. CSS not compiled yet
      }
    })
    .map(toUrl)
};
