import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_AREAS } from '../../src/game/GameAreas.js';
import { getShopLayout, SHOP_COUNTER_WIDTH, SHOP_CUSTOMER_WIDTH, SHOP_HERO_SLOT_LEFT, SHOP_HERO_SLOT_TOP, SHOP_SALE_BOARD_GAP, SHOP_SALE_BOARD_WIDTH, SHOP_SELL_SLOT_LEFT, SHOP_SELL_SLOT_TOP } from '../../src/game/ShopLayout.js';

test('shop layout reserves a center counter and keeps the customer contents below the hero slot', () => {
  const area = GAME_AREAS.shop;
  const layout = getShopLayout(area);
  assert.equal(layout.customer.width, SHOP_CUSTOMER_WIDTH);
  assert.equal(layout.counter.width, SHOP_COUNTER_WIDTH);
  assert.equal(layout.store.width, 200);
  assert.ok(layout.bagRowY > layout.heroSlot.y);
  assert.equal(layout.transaction.purchaseX, area.x + 424);
  assert.equal(layout.transaction.top, area.y + 164);
  assert.equal(layout.saleBoards.sale.width, SHOP_SALE_BOARD_WIDTH);
  assert.equal(layout.saleBoards.next.x - (layout.saleBoards.sale.x + layout.saleBoards.sale.width), SHOP_SALE_BOARD_GAP);
  assert.equal(layout.heroSlot.x, area.x + SHOP_HERO_SLOT_LEFT);
  assert.equal(layout.heroSlot.y, area.y + SHOP_HERO_SLOT_TOP);
  assert.equal(layout.transaction.sellX, area.x + SHOP_SELL_SLOT_LEFT);
  assert.equal(layout.transaction.sellItemsTop, area.y + SHOP_SELL_SLOT_TOP);
});
