import test from 'node:test';
import assert from 'node:assert/strict';
import ShopState from '../../src/game/ShopState.js';

test('shop state keeps the current sale tag and one upcoming tag', () => {
  const shop = ShopState.createRandom(() => 0);
  assert.equal(shop.saleTag, 'valor');
  assert.equal(shop.nextTag, 'valor');
  shop.advance(() => 0.5);
  assert.equal(shop.saleTag, 'valor');
  assert.equal(shop.nextTag, 'valor');
  assert.equal(shop.laterTag, 'feather');
});

test('route trends preserve the current sale while a hero is shopping', () => {
  const shop = new ShopState({ saleTag: 'valor', nextTag: 'iron', laterTag: 'arcane' });
  shop.applyRouteTrends({ saleTag: 'fire', nextTag: 'water' }, { preserveCurrent: true });
  assert.equal(shop.saleTag, 'valor');
  assert.equal(shop.nextTag, 'fire');
  assert.equal(shop.laterTag, 'water');
  shop.applyRouteTrends({ saleTag: 'lightning', nextTag: 'vitality' });
  assert.equal(shop.saleTag, 'lightning');
  assert.equal(shop.nextTag, 'vitality');
});
