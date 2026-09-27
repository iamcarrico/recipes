import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
import yaml from 'js-yaml';
import { zipSync } from 'fflate';
import { splitSteps, imageExtension } from '../lib/paprika.js';

test('splits Paprika directions on every line, dropping numbering', () => {
  // Regression: blank-line splitting merged a heading and its numbered steps.
  assert.deepEqual(splitSteps('**Topping**\n1.\tStrain the juice\n2. Cut the cake\n\nServe.'), [
    '**Topping**',
    'Strain the juice',
    'Cut the cake',
    'Serve.'
  ]);
});

test('recognises images by their bytes', () => {
  assert.equal(imageExtension(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), '.jpg');
  assert.equal(imageExtension(Buffer.from('not an image')), null);
});

test('imports a Paprika export end to end', (t) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'paprika-'));
  const images = path.join(dir, 'images');
  t.after(() => rmSync(dir, { recursive: true, force: true }));

  const recipe = {
    name: 'Test Pie',
    categories: ['dessert', 'Breakfast/Brunch'],
    ingredients: '**Crust**\n1 cup flour\n\n**Filling**\n2 eggs',
    directions: 'Mix.\n\n**Bake**\n1. Bake 20 minutes.',
    servings: '8',
    nutritional_info: 'vegetarian\nCalories 300\nSodium 20 mg\nProtein 4 g',
    notes: 'Best warm.'
  };
  const bundle = path.join(dir, 'export.paprikarecipes');
  writeFileSync(bundle, zipSync({ 'Test Pie.paprikarecipe': gzipSync(JSON.stringify(recipe)) }));

  const output = execFileSync(
    process.execPath,
    ['scripts/import-paprika.js', bundle, '--out', dir, '--images', images],
    { encoding: 'utf8' }
  );
  assert.match(output, /1 written/);
  assert.match(output, /left off: Breakfast\/Brunch/);

  const markdown = readFileSync(path.join(dir, 'test-pie.md'), 'utf8');
  const frontMatter = yaml.load(markdown.split('---')[1]);
  assert.deepEqual(frontMatter.tags, ['Dessert']);
  assert.deepEqual(frontMatter.ingredients, ['**Crust**', '1 cup flour', '**Filling**', '2 eggs']);
  assert.deepEqual(frontMatter.directions, ['Mix.', '**Bake**', 'Bake 20 minutes.']);
  assert.equal(frontMatter.nutrition, 'Calories 300\nProtein 4 g');
  assert.match(markdown, /---\n\nBest warm\.\n$/);

  // A second run leaves the hand-editable file alone.
  const again = execFileSync(process.execPath, ['scripts/import-paprika.js', bundle, '--out', dir, '--images', images], {
    encoding: 'utf8'
  });
  assert.match(again, /1 skipped/);
  assert.ok(!existsSync(path.join(images, 'test-pie.jpg')), 'no photo in the export, so none written');
});
