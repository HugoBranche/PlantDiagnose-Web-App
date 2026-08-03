const test = require('node:test');
const assert = require('node:assert/strict');
const { filterRealBotanists } = require('./botanistFiltering');

test('filters out demo and seed botanists without a real user id', () => {
  const rows = [
    { id: 1, userId: 10, name: 'Real Botanist' },
    { id: 2, userId: null, name: 'Demo Botanist' },
    { id: 3, userId: 999, name: 'Another Real Botanist' },
  ];

  const result = filterRealBotanists(rows, [
    { id: 10, role: 'botanist', verified: true },
    { id: 999, role: 'botanist', verified: true },
  ]);

  assert.deepEqual(result.map((b) => b.id), [1, 3]);
});

test('keeps only botanists whose users are visible and real', () => {
  const rows = [
    { id: 1, userId: 10, name: 'Visible' },
    { id: 2, userId: 20, name: 'Hidden' },
  ];

  const result = filterRealBotanists(rows, [
    { id: 10, role: 'botanist', verified: true },
    { id: 20, role: 'botanist', verified: false },
  ]);

  assert.deepEqual(result.map((b) => b.id), [1]);
});
