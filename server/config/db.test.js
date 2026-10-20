import test from 'node:test';
import assert from 'node:assert/strict';
import { connectDb } from './db.js';

test('does not silently use memory without explicit development opt-in', async () => {
  const originalUri = process.env.MONGO_URI;
  const originalEnvironment = process.env.NODE_ENV;
  const originalOptIn = process.env.ALLOW_IN_MEMORY_DB;
  delete process.env.MONGO_URI;
  process.env.NODE_ENV = 'production';
  delete process.env.ALLOW_IN_MEMORY_DB;
  await assert.rejects(connectDb(), /MONGO_URI is required/);
  if (originalUri === undefined) delete process.env.MONGO_URI;
  else process.env.MONGO_URI = originalUri;
  if (originalEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnvironment;
  if (originalOptIn === undefined) delete process.env.ALLOW_IN_MEMORY_DB;
  else process.env.ALLOW_IN_MEMORY_DB = originalOptIn;
});
