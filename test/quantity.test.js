import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber, formatQuantity, formatUnit, parseAmount, formatAmount } from '../src/assets/js/quantity.js';

test('parses whole numbers, fractions, mixed numbers and unicode fractions', () => {
  assert.equal(parseNumber('2'), 2);
  assert.equal(parseNumber('3/4'), 0.75);
  assert.equal(parseNumber('1 1/2'), 1.5);
  assert.equal(parseNumber('½'), 0.5);
  assert.equal(parseNumber('1½'), 1.5);
  assert.equal(parseNumber('0.25'), 0.25);
  assert.equal(parseNumber('abc'), null);
});

test('tolerates spaces around the fraction slash', () => {
  // Regression: "1 1/ 2 teaspoons" matched but silently didn't scale.
  assert.equal(parseNumber('1 1/ 2'), 1.5);
  assert.equal(parseNumber('3 / 4'), 0.75);
});

test('formats quantities as friendly fractions', () => {
  assert.equal(formatQuantity(1.5), '1 1/2');
  assert.equal(formatQuantity(0.75), '3/4');
  assert.equal(formatQuantity(1 / 3), '1/3');
  assert.equal(formatQuantity(3), '3');
  assert.equal(formatQuantity(0.1), '0.1');
});

test('uses the singular for one or less', () => {
  assert.equal(formatUnit('cups', 1), 'cup');
  assert.equal(formatUnit('cup', 0.5), 'cup');
  assert.equal(formatUnit('cup', 2), 'cups');
  assert.equal(formatUnit('Tablespoons', 1), 'Tablespoon');
  assert.equal(formatUnit('tsp', 3), 'tsp');
  assert.equal(formatUnit('cake', 2), 'cakes');
});

test('parses and scales a leading amount, including ranges', () => {
  const amount = parseAmount('2 to 3 cups shredded cheese');
  assert.deepEqual(amount, { quantity: 2, quantityMax: 3, unit: 'cups', rest: 'shredded cheese' });
  assert.equal(formatAmount(amount, 2), '4 to 6 cups');
  assert.equal(formatAmount(parseAmount('1 pound pasta'), 0.5), '1/2 pound');
  assert.equal(parseAmount('Salt and pepper to taste'), null);
});
