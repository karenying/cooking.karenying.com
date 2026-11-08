import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCESS_CACHE_KEY, ACCESS_CACHE_TTL, hasCachedAccess, cacheAccess, clearCachedAccess } from '../src/auth-access-cache.ts';
const now = 1_800_000_000_000;
const session = { user: { id: 'user-a' }, expires_at: now / 1000 + 3600, access_token: 'do-not-copy', refresh_token: 'do-not-copy' };
function storage() {
  const items = new Map();
  globalThis.localStorage = { getItem: key => items.get(key) ?? null, setItem: (key,value) => items.set(key,value), removeItem: key => items.delete(key) };
  return items;
}
test('positive access cache lasts five minutes without extending on reads or storing credentials', () => {
  const items = storage();
  assert.equal(hasCachedAccess(session, now), false);
  cacheAccess(session, now);
  assert.deepEqual(JSON.parse(items.get(ACCESS_CACHE_KEY)), { userId: 'user-a', expiresAt: now + ACCESS_CACHE_TTL });
  assert.equal(hasCachedAccess(session, now + ACCESS_CACHE_TTL - 1), true);
  assert.equal(hasCachedAccess(session, now + ACCESS_CACHE_TTL), false);
});
test('cache cannot carry access between users or beyond the active token expiry', () => {
  storage();
  const short = { ...session, expires_at: now / 1000 + 30 };
  cacheAccess(short, now);
  assert.equal(hasCachedAccess({ ...short, user: { id: 'user-b' } }, now), false);
  assert.equal(hasCachedAccess(short, now + 30_000), false);
  assert.equal(hasCachedAccess({ ...session, expires_at: now / 1000 }, now), false);
  assert.equal(hasCachedAccess({ user: { id: 'user-a' } }, now), false);
});
test('malformed cache, clock changes, logout and unavailable storage fall back to a fresh check', () => {
  const items = storage();
  for (const value of ['bad-json', 'null', '{}', JSON.stringify({userId:'user-a',expiresAt:now+ACCESS_CACHE_TTL+1})]) {
    items.set(ACCESS_CACHE_KEY, value);
    assert.equal(hasCachedAccess(session, now), false);
  }
  cacheAccess(session, now);
  clearCachedAccess();
  assert.equal(hasCachedAccess(session, now), false);
  globalThis.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } };
  assert.equal(hasCachedAccess(session, now), false);
  assert.doesNotThrow(() => cacheAccess(session, now));
  assert.doesNotThrow(() => clearCachedAccess());
});
