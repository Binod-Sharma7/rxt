import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrustedOrder, isSupportedPaymentMethod, reserveStock } from './order.js';

test('accepts only configured payment methods', () => {
  assert.equal(isSupportedPaymentMethod('eSewa'), true);
  assert.equal(isSupportedPaymentMethod('Cash On Delivery'), true);
  assert.equal(isSupportedPaymentMethod('FonePay'), false);
  assert.equal(isSupportedPaymentMethod('Bank Transfer'), false);
  assert.equal(isSupportedPaymentMethod('Card'), false);
});

const catalog = [
  { id: 'lamp-1', name: 'Lamp', category: 'lamps', price: 1000, discount: 10, stock: 3, colors: ['Sand'], dimensions: '10 cm', images: ['/uploads/lamp.jpg'] }
];

test('calculates trusted totals from catalog values', () => {
  const order = buildTrustedOrder([{ id: 'lamp-1', quantity: 2, price: 1, total: 1 }], catalog);
  assert.equal(order.error, undefined);
  assert.equal(order.subtotal, 2000);
  assert.equal(order.discountAmount, 200);
  assert.equal(order.total, 1800);
  assert.equal(order.items[0].price, 1000);
  assert.equal(order.items[0].quantity, 2);
});

test('rejects invalid quantities, missing products, and insufficient stock', () => {
  assert.match(buildTrustedOrder([{ id: 'lamp-1', quantity: 0 }], catalog).error, /valid quantity/);
  assert.match(buildTrustedOrder([{ id: 'missing', quantity: 1 }], catalog).error, /no longer available/);
  assert.match(buildTrustedOrder([{ id: 'lamp-1', quantity: 4 }], catalog).error, /Insufficient stock/);
});

test('rolls back earlier reservations when a later item is unavailable', async () => {
  const products = [{ id: 'lamp-1', stock: 3 }];
  const result = await reserveStock([
    { id: 'lamp-1', name: 'Lamp', quantity: 2 },
    { id: 'missing', name: 'Missing', quantity: 1 }
  ], { useDb: false, products });
  assert.match(result.error, /Insufficient stock/);
  assert.equal(products[0].stock, 3);
});
