import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from './rateLimit.js';

test('returns 429 after the configured request limit', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1, message: 'limited' });
  const request = { ip: `test-${Date.now()}-${Math.random()}`, socket: {} };
  const responses = [];
  const response = {
    setHeader: () => {},
    status: (status) => ({ json: (body) => responses.push({ status, body }) })
  };
  let nextCalls = 0;
  limiter(request, response, () => { nextCalls += 1; });
  limiter(request, response, () => { nextCalls += 1; });
  assert.equal(nextCalls, 1);
  assert.deepEqual(responses, [{ status: 429, body: { message: 'limited' } }]);
});

test('does not count skipped session initialization requests', () => {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    max: 1,
    message: 'limited',
    skip: (request) => request.path === '/auth/me'
  });
  const request = { ip: `session-${Date.now()}-${Math.random()}`, path: '/auth/me', socket: {} };
  const response = { setHeader: () => {}, status: () => ({ json: () => {} }) };
  let nextCalls = 0;

  limiter(request, response, () => { nextCalls += 1; });
  limiter(request, response, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
});

test('allows normal repeated authentication attempts before the limit', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3, message: 'limited' });
  const request = { ip: `login-${Date.now()}-${Math.random()}`, socket: {} };
  const response = { setHeader: () => {}, status: () => ({ json: () => {} }) };
  let nextCalls = 0;

  limiter(request, response, () => { nextCalls += 1; });
  limiter(request, response, () => { nextCalls += 1; });
  limiter(request, response, () => { nextCalls += 1; });

  assert.equal(nextCalls, 3);
});
