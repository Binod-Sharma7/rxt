import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken, authorizeAdmin, getJwtSecret, verifyAdminCredentials } from './auth.js';

const originalSecret = process.env.JWT_SECRET;
const secret = 'test-secret-that-is-at-least-32-characters-long';
process.env.JWT_SECRET = secret;

test.after(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

test('requires a sufficiently long JWT secret', () => {
  const current = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'short';
  assert.throws(() => getJwtSecret(), /at least 32 characters/);
  process.env.JWT_SECRET = current;
});

test('accepts valid tokens and rejects invalid tokens', () => {
  const validRequest = { headers: { authorization: `Bearer ${jwt.sign({ id: 'user-1', role: 'customer' }, secret)}` } };
  let nextCalled = false;
  authenticateToken(validRequest, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
  assert.equal(validRequest.user.id, 'user-1');

  let status;
  authenticateToken({ headers: { authorization: 'Bearer invalid' } }, { status: (value) => { status = value; return { json: () => {} }; } }, () => {});
  assert.equal(status, 403);
});

test('requires a token and verifies only admin credentials', async () => {
  let missingStatus;
  authenticateToken({ headers: {} }, { status: (value) => { missingStatus = value; return { json: () => {} }; } }, () => {});
  assert.equal(missingStatus, 401);

  const admin = { role: 'admin', password: await bcrypt.hash('admin-password', 10) };
  assert.equal(await verifyAdminCredentials(admin, 'admin-password'), true);
  assert.equal(await verifyAdminCredentials(admin, 'wrong-password'), false);
  assert.equal(await verifyAdminCredentials({ ...admin, role: 'customer' }, 'admin-password'), false);
});

test('rejects expired tokens', () => {
  const expiredToken = jwt.sign({ id: 'user-1', role: 'customer' }, secret, { expiresIn: -1 });
  let status;
  authenticateToken({ headers: { authorization: `Bearer ${expiredToken}` } }, { status: (value) => { status = value; return { json: () => {} }; } }, () => {});
  assert.equal(status, 403);
});

test('only admin claims pass admin authorization', () => {
  let status;
  authorizeAdmin({ user: { role: 'customer' } }, { status: (value) => { status = value; return { json: () => {} }; } }, () => {});
  assert.equal(status, 403);
});
