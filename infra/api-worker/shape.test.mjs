// The resolver Worker's body rules (shape.js).  Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canonicalQuery, KNOWN_FIELDS, LIST_FIELDS, shapeProblem } from './shape.js';

const single = { booking_type: 'accommodation', accommodation_type: 'hotel', hotel_preference: 'stars_4', region: 'paphos', locale: 'en' };
const lists = { booking_type: 'accommodation', accommodation_types: ['hotel'], hotel_preferences: ['stars_5', 'stars_4'], region: 'paphos', locale: 'en' };

test('every field the resolver reads is known, and the three lists are among them', () => {
  for (const f of ['booking_type', 'accommodation_type', 'hotel_preference', 'activity_category', 'region', 'locale']) assert.ok(KNOWN_FIELDS.includes(f), f);
  for (const f of LIST_FIELDS) assert.ok(KNOWN_FIELDS.includes(f), f);
  assert.equal(KNOWN_FIELDS.length, 9);
});

test('the single shape passes; the list shape passes', () => {
  assert.equal(shapeProblem(single), null);
  assert.equal(shapeProblem(lists), null);
  assert.equal(shapeProblem({ booking_type: 'activity', activity_categories: ['boat_cruises', 'jeep_quad_adventure'], region: 'paphos', locale: 'en' }), null);
});

test('refusals: not an object, an unknown field, a bad string, a bad list', () => {
  assert.equal(shapeProblem(null), 'body must be a JSON object');
  assert.equal(shapeProblem([]), 'body must be a JSON object');
  assert.equal(shapeProblem({ ...single, extra: 'x' }), 'unknown field: extra');
  assert.equal(shapeProblem({ ...single, region: '' }), 'region must be a non-empty string');
  assert.equal(shapeProblem({ ...single, region: 'x'.repeat(65) }), 'region must be a non-empty string');
  assert.equal(shapeProblem({ ...single, region: ['paphos'] }), 'region must be a non-empty string');
  const bad = 'hotel_preferences must be an array of 1 to 8 non-empty strings';
  assert.equal(shapeProblem({ ...lists, hotel_preferences: 'stars_4' }), bad, 'a string where a list goes');
  assert.equal(shapeProblem({ ...lists, hotel_preferences: [] }), bad);
  assert.equal(shapeProblem({ ...lists, hotel_preferences: ['', 'stars_4'] }), bad);
  assert.equal(shapeProblem({ ...lists, hotel_preferences: [4, 5] }), bad);
  assert.equal(shapeProblem({ ...lists, hotel_preferences: Array(9).fill('x') }), bad);
});

test('the cache key: fixed field order, present fields only, lists sorted', () => {
  assert.equal(canonicalQuery(single), 'booking_type=accommodation&accommodation_type=hotel&hotel_preference=stars_4&region=paphos&locale=en');
  assert.equal(canonicalQuery({ locale: 'en', region: 'paphos', hotel_preference: 'stars_4', accommodation_type: 'hotel', booking_type: 'accommodation' }), canonicalQuery(single), 'key order does not matter');
  assert.equal(canonicalQuery(lists), 'booking_type=accommodation&accommodation_types=hotel&hotel_preferences=stars_4%2Cstars_5&region=paphos&locale=en');
  assert.equal(canonicalQuery({ ...lists, hotel_preferences: ['stars_4', 'stars_5'] }), canonicalQuery(lists), '"4,5" and "5,4" are one entry');
  assert.notEqual(canonicalQuery(single), canonicalQuery({ ...single, hotel_preference: 'none' }));
});
