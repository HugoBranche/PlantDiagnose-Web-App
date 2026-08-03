const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateUpdatedBotanistRating } = require('./reviewUtils');

test('calculates a new average rating when a review is added', () => {
  const result = calculateUpdatedBotanistRating(4.5, 2, 5);
  assert.equal(result.rating, 4.7);
  assert.equal(result.reviews, 3);
});

test('starts from a first review when there are no prior reviews', () => {
  const result = calculateUpdatedBotanistRating(0, 0, 4);
  assert.equal(result.rating, 4);
  assert.equal(result.reviews, 1);
});
