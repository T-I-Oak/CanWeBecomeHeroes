import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicAssetPath } from '../../src/chips/PublicAssetPath.js';

test('public asset paths retain their root-relative form outside Vite', () => {
  assert.equal(resolvePublicAssetPath('/assets/tags/valor.png'), '/assets/tags/valor.png');
});

test('external asset URLs are left unchanged', () => {
  assert.equal(resolvePublicAssetPath('https://example.test/icon.png'), 'https://example.test/icon.png');
});
