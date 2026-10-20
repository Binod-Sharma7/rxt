import test from 'node:test';
import assert from 'node:assert/strict';
import { belongsToCustomer, normalizeHistoryIds } from './history.js';

test('normalizes unique history IDs and rejects invalid payloads', () => {
  assert.deepEqual(normalizeHistoryIds([' order-1 ', 'order-1', 'order-2']).ids, ['order-1', 'order-2']);
  assert.match(normalizeHistoryIds([]).error, /between 1 and 50/);
  assert.match(normalizeHistoryIds('order-1').error, /array/);
  assert.match(normalizeHistoryIds(Array.from({ length: 51 }, (_, index) => `order-${index}`)).error, /between 1 and 50/);
});

test('only matches the authenticated customer ownership identity', () => {
  assert.equal(belongsToCustomer({ userId: 'customer-1' }, 'customer-1'), true);
  assert.equal(belongsToCustomer({ userId: 'customer-2' }, 'customer-1'), false);
  assert.equal(belongsToCustomer({ customer: 'mongo-customer-1' }, 'customer-1', 'mongo-customer-1'), true);
  assert.equal(belongsToCustomer({ customer: 'mongo-customer-2' }, 'customer-1', 'mongo-customer-1'), false);
});
