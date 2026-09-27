import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';
import Eleventy from '@11ty/eleventy';

// Builds the real site, so it catches what unit tests can't: data-cascade
// surprises such as a global `tags` value leaking into every recipe.
test('the homepage shows each recipe with exactly its own tags', async (t) => {
  const output = mkdtempSync(path.join(tmpdir(), 'site-'));
  t.after(() => rmSync(output, { recursive: true, force: true }));

  // source: 'cli' makes Eleventy honour this output folder over the config
  // file's, as it does for --output; otherwise it would overwrite _site.
  const eleventy = new Eleventy('src', output, { configPath: 'eleventy.config.js', quietMode: true, source: 'cli' });
  await eleventy.write();

  const expected = new Map();
  for (const file of readdirSync('src/recipes').filter((name) => name.endsWith('.md'))) {
    const frontMatter = yaml.load(readFileSync(path.join('src/recipes', file), 'utf8').split(/^---$/m)[1]);
    expected.set(`/recipes/${file.replace(/\.md$/, '')}/`, frontMatter.tags ?? []);
  }

  const html = readFileSync(path.join(output, 'index.html'), 'utf8');
  const cards = [...html.matchAll(/<article[^>]*data-tags="([^"]*)"[\s\S]*?<a class="card__link" href="([^"]+)"/g)];
  assert.equal(cards.length, expected.size, 'one card per recipe');

  for (const [, tags, url] of cards) {
    assert.deepEqual(tags ? tags.split(',') : [], expected.get(url), url);
  }

  const counts = Object.fromEntries(
    [...html.matchAll(/data-tag="([^"]+)"[^>]*>\s*[^<]*<span class="tag-filter__count">(\d+)/g)].map(([, tag, count]) => [tag, Number(count)])
  );
  const actual = {};
  for (const tags of expected.values()) for (const tag of tags) actual[tag] = (actual[tag] ?? 0) + 1;
  assert.deepEqual(counts, actual);
});
