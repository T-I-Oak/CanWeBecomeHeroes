import test from 'node:test';
import assert from 'node:assert/strict';
import ShopState from '../../src/game/ShopState.js';

test('shop state keeps the current sale tag and one upcoming tag', () => {
  const shop = ShopState.createRandom(() => 0);
  assert.equal(shop.saleTag, 'valor');
  assert.equal(shop.nextTag, 'valor');
  shop.advance(() => 0.5);
  assert.equal(shop.saleTag, 'valor');
  assert.equal(shop.nextTag, 'gem');
});
