import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headingText, toLine, toSections, stripMarkdown } from '../lib/sections.js';
import { parseIngredients, parseServings, ingredientLines } from '../lib/ingredients.js';
import { parseDirections } from '../lib/directions.js';

test('recognises bold and colon headings', () => {
  assert.equal(headingText('**Topping**'), 'Topping');
  assert.equal(headingText('**For the filling:**'), 'For the filling');
  assert.equal(headingText('For the crust:'), 'For the crust');
});

test('a bold label followed by text is not a heading', () => {
  assert.equal(headingText('**Oven**: bake for 25 minutes'), null);
  assert.equal(headingText('Whisk everything together. Then add the following:'), null);
});

test('restores headings YAML parsed as mappings', () => {
  // Regression: "- For the crust:" rendered as [object Object].
  assert.equal(toLine({ 'For the crust': null }), 'For the crust:');
  assert.equal(toLine({ Optional: 'ham, bacon' }), 'Optional: ham, bacon');
});

test('groups ingredients into sections without making amounts headings', () => {
  const sections = parseIngredients([{ 'For the crust': null }, '1 cup flour', '2 cups:', '**Filling**', '4 eggs']);
  assert.deepEqual(
    sections.map((section) => [section.title, section.items.map((item) => item.raw)]),
    [
      ['For the crust', ['1 cup flour', '2 cups:']],
      ['Filling', ['4 eggs']]
    ]
  );
});

test('groups directions into sections', () => {
  const sections = parseDirections(['Preheat.', '**Frosting**', 'Mix.', 'Spread.']);
  assert.deepEqual(sections, [
    { title: null, items: ['Preheat.'] },
    { title: 'Frosting', items: ['Mix.', 'Spread.'] }
  ]);
});

test('ingredient lines for search drop headings and markdown', () => {
  assert.deepEqual(ingredientLines(['**Cake**', '1 cup **brown** sugar']), ['1 cup brown sugar']);
  assert.equal(stripMarkdown('**Oven**: _hot_'), 'Oven: hot');
});

test('parses yields with words around the number', () => {
  assert.deepEqual(
    { ...parseServings('Makes 16 bars'), raw: undefined },
    { quantity: 16, quantityMax: null, unit: '', prefix: 'Makes', suffix: 'bars', raw: undefined }
  );
  assert.equal(parseServings('4 to 6').quantityMax, 6);
  assert.equal(parseServings(''), null);
});

test('toSections keeps a heading with nothing under it', () => {
  assert.deepEqual(toSections(['**Lonely**'], (line) => line), [{ title: 'Lonely', items: [] }]);
});
