import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductPricing } from './productPricing.js';

test('accepts valid product pricing and normalizes numeric values', () => {
  assert.deepEqual(validateProductPricing({ price: '1250.5', discount: '15' }), {
    errors: {},
    updates: { price: 1250.5, discount: 15 }
  });
});

test('rejects invalid price and discount values', () => {
  const result = validateProductPricing({ price: '0', discount: '101' });
  assert.deepEqual(result.errors, {
    price: 'Price must be greater than zero.',
    discount: 'Discount must be between 0 and 100 percent.'
  });
  assert.deepEqual(result.updates, {});
});

test('supports partial updates without inventing omitted pricing fields', () => {
  assert.deepEqual(validateProductPricing({ discount: 0 }), {
    errors: {},
    updates: { discount: 0 }
  });
});
