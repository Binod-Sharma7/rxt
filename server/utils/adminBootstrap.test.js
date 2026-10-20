import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { provisionConfiguredAdmin } from './adminBootstrap.js';

const makeUserModel = (user) => ({
  findOne: async () => user,
  create: async (payload) => payload
});

test('promotes only the explicitly configured email when bootstrap is enabled', async () => {
  const user = {
    email: 'admin@example.com',
    role: 'customer',
    password: await bcrypt.hash('old-password', 10),
    save: async () => {}
  };
  const result = await provisionConfiguredAdmin(makeUserModel(user), {
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'new-secure-password',
    ADMIN_BOOTSTRAP: 'true'
  });
  assert.equal(result, 'promoted');
  assert.equal(user.role, 'admin');
  assert.equal(await bcrypt.compare('new-secure-password', user.password), true);
});

test('does not promote an existing customer without explicit bootstrap', async () => {
  const user = { email: 'admin@example.com', role: 'customer', password: 'hash', save: async () => {} };
  await assert.rejects(
    provisionConfiguredAdmin(makeUserModel(user), { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'secure-password' }),
    /ADMIN_BOOTSTRAP=true/
  );
  assert.equal(user.role, 'customer');
});

test('promotes the exact configured email when its stored password already matches', async () => {
  const user = {
    email: 'admin@example.com',
    role: 'customer',
    password: await bcrypt.hash('matching-password', 10),
    save: async () => {}
  };
  const result = await provisionConfiguredAdmin(makeUserModel(user), {
    ADMIN_EMAIL: 'admin@example.com',
    ADMIN_PASSWORD: 'matching-password'
  });
  assert.equal(result, 'promoted-matching-password');
  assert.equal(user.role, 'admin');
});