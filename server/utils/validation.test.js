import test from 'node:test';
import assert from 'node:assert/strict';
import { isNepalPhoneNumber, validateCheckoutPayload } from './validation.js';

test('rejects incomplete checkout details', () => {
  const errors = validateCheckoutPayload({
    customerName: 'Jo',
    phone: '123',
    email: '',
    province: '',
    district: ''
  });

  assert.equal(errors.customerName, 'Customer name must be at least 3 characters');
  assert.equal(errors.phone, 'Enter a valid Nepal phone number');
  assert.equal(errors.address, 'Address is required');
  assert.equal(errors.email, undefined);
  assert.equal(errors.streetAddress, undefined);
  assert.equal(errors.province, undefined);
});

test('accepts valid Nepal phone numbers', () => {
  assert.equal(isNepalPhoneNumber('+9779841234567'), true);
  assert.equal(isNepalPhoneNumber('9801234567'), true);
  assert.equal(isNepalPhoneNumber('1234567890'), false);
});
