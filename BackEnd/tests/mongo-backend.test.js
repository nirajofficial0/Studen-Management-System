const test = require('node:test');
const assert = require('node:assert/strict');
const { connectDB } = require('../config/db');

test('connectDB should not crash when MongoDB is unavailable', async () => {
  const result = await connectDB();
  assert.equal(typeof result, 'boolean');
});
