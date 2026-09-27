import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe } from '../lib/validate.js';

const TAGS = ['Dessert', 'Side'];
const valid = { title: 'Pie', tags: ['Dessert'], ingredients: ['1 crust'], directions: ['Bake.'] };
const errorsFor = (data) => validateRecipe(data, { tags: TAGS }).errors;

test('a complete recipe passes', () => {
  assert.deepEqual(validateRecipe(valid, { tags: TAGS }), { errors: [], warnings: [] });
});

test('requires a title, ingredients and directions', () => {
  assert.deepEqual(errorsFor({ tags: [] }), ['title: required', 'ingredients: required', 'directions: required']);
});

test('suggests the intended field for a misspelling', () => {
  assert.ok(errorsFor({ ...valid, ingrediants: ['x'] }).some((error) => error.includes('did you mean "ingredients"')));
});

test('rejects tags outside the list, with a suggestion', () => {
  const errors = errorsFor({ ...valid, tags: ['dessert', 'Desert', 'Snacks'] });
  assert.equal(errors.length, 3);
  assert.match(errors[0], /did you mean "Dessert"/);
  assert.match(errors[1], /did you mean "Dessert"/);
  assert.doesNotMatch(errors[2], /did you mean/);
});

test('only warns when a recipe has no tags', () => {
  const result = validateRecipe({ ...valid, tags: [] }, { tags: TAGS });
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
});

test('checks dates for real calendar days', () => {
  // Regression: unquoted 2024-13-45 rolled over into a valid date.
  assert.deepEqual(errorsFor({ ...valid, created: '2024-02-29' }), []);
  for (const created of ['2024-13-45', '2023-02-29', 'yesterday']) {
    assert.equal(errorsFor({ ...valid, created }).length, 1, created);
  }
});

test('checks links, ratings and photos', () => {
  assert.equal(errorsFor({ ...valid, sourceUrl: 'thekitchn.com/pie' }).length, 1);
  assert.equal(errorsFor({ ...valid, sourceUrl: 'https://thekitchn.com/pie' }).length, 0);
  assert.equal(errorsFor({ ...valid, rating: 7 }).length, 1);
  assert.equal(errorsFor({ ...valid, image: '/assets/images/recipes/missing.jpg' }).length, 1);
});
