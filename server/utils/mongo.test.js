import test from 'node:test';
import assert from 'node:assert/strict';
import { idLookup } from './mongo.js';

test('uses application id lookup without casting malformed ObjectIds', () => {
  assert.deepEqual(idLookup('order-123'), { id: 'order-123' });
});

test('supports valid ObjectId lookup values', () => {
  const value = '507f1f77bcf86cd799439011';
  assert.deepEqual(idLookup(value), { $or: [{ id: value }, { _id: value }] });
});
