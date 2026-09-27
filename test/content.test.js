import { test } from 'node:test';
import assert from 'node:assert/strict';
import { macrosOnly } from '../lib/nutrition.js';
import { findDurations, timerize } from '../lib/timers.js';
import { foldForSearch } from '../src/assets/js/text.js';

test('keeps only the macros, in a fixed order', () => {
  const trimmed = macrosOnly(
    'gluten-free\nCalories: 403\nTotal Carbohydrates: 61.7 g\nCholesterol: 2.4 mg\nTotal Fat: 13.9 g\n' +
      'Protein: 7.8 g\nSaturated fat: 1.3 g\nUnsaturated fat: 0 g\nSodium 433 mg\nSugar: 5.5 g'
  );
  assert.equal(
    trimmed,
    'Calories: 403\nTotal Fat: 13.9 g\nSaturated fat: 1.3 g\nTotal Carbohydrates: 61.7 g\nSugar: 5.5 g\nProtein: 7.8 g'
  );
});

test('drops nutrition with no macros at all', () => {
  assert.equal(macrosOnly('Bad.'), undefined);
  assert.equal(macrosOnly(''), undefined);
});

test('finds cooking durations and times the low end of ranges', () => {
  const found = (text) => findDurations(text).map(({ text: match, seconds }) => [match, seconds]);
  assert.deepEqual(found('Bake for 25-30 minutes'), [['25-30 minutes', 1500]]);
  assert.deepEqual(found('about 1 1/2 hours'), [['1 1/2 hours', 5400]]);
  assert.deepEqual(found('Approximately 10-11min'), [['10-11min', 600]]);
  assert.deepEqual(found('cook 30 seconds'), [['30 seconds', 30]]);
});

test('ignores numbers that are not durations', () => {
  for (const text of ['a 350 degree oven', '1/2 cup water', '12-inch skillet', 'up to 1 week', '3 to 4 days ahead']) {
    assert.deepEqual(findDurations(text), [], text);
  }
});

test('wraps durations in timer buttons without touching markup', () => {
  const html = timerize('<strong>Oven</strong>: bake 25 minutes');
  assert.match(html, /^<strong>Oven<\/strong>: bake <button type="button" class="timer-chip" data-timer="1500"/);
  assert.match(html, /25 minutes<\/button>$/);
});

test('folds accents and case for search', () => {
  assert.equal(foldForSearch('Crème Fraîche'), 'creme fraiche');
  assert.equal(foldForSearch('JALAPEÑO'), 'jalapeno');
});
