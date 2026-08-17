import test from 'node:test';
import assert from 'node:assert/strict';
import { createRandomChipAssets } from '../../src/chips/AssetCatalog.js';

test('hero asset selection produces a hero center image and zero to three tags', () => {
  const values = [0.99, 0, 0.2, 0.5, 0.8];
  let index = 0;
  const assets = createRandomChipAssets('hero', () => values[index++]);

  assert.equal(assets.centerPath, '/assets/heroes/cleric.png');
  assert.equal(assets.tagPaths.length, 3);
  assert.deepEqual(assets.tagPaths, [
    '/assets/tags/cloth.png',
    '/assets/tags/fortune.png',
    '/assets/tags/valor.png',
  ]);
});

test('item asset selection produces an item center image', () => {
  const assets = createRandomChipAssets('item', () => 0.1);

  assert.equal(assets.centerPath, '/assets/items/hand-bow.png');
  assert.equal(assets.tagPaths.length, 0);
});
