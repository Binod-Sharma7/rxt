import test from 'node:test';
import assert from 'node:assert/strict';
import { assertProductionStorage, isCloudinaryConfigured } from './storage.js';

test('requires Cloudinary in production', () => {
  const productionEnv = { NODE_ENV: 'production' };
  assert.equal(isCloudinaryConfigured(productionEnv), false);
  assert.throws(() => assertProductionStorage(productionEnv), /Cloudinary configuration is required/);
});

test('allows local storage only outside production', () => {
  assert.doesNotThrow(() => assertProductionStorage({ NODE_ENV: 'development' }));
  assert.equal(isCloudinaryConfigured({
    NODE_ENV: 'production',
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret'
  }), true);
});
