import { GAME_AREAS } from '../game/GameAreas.js';
import { getShopLayout } from '../game/ShopLayout.js';
import { getEquipmentSlotItemAtPoint, getEquipmentSlotTagAtPoint } from './EquipmentSlotHitTest.js';
import { isPointInRect } from './RectHitTest.js';
import { getRevealedPurchaseEntries, getShopSoldItems } from './ShopPanelPresenter.js';

const SHOP_TREND_TAG_SIZE = 48;
const SHOP_BAG_SIZE = 48;

function getShopTrendTagAtPoint(point, shop, layout) {
  return [
    { tag: shop.saleTag, board: layout.saleBoards.sale },
    { tag: shop.nextTag, board: layout.saleBoards.next },
  ].find(({ board }) => isPointInRect(
    point,
    board.x + board.width / 2 - SHOP_TREND_TAG_SIZE / 2,
    board.y + 44,
    SHOP_TREND_TAG_SIZE,
    SHOP_TREND_TAG_SIZE,
  ))?.tag ?? null;
}

function getShopEquipmentEntryAtPoint(point, bag, transaction, findAtPoint) {
  const layout = getShopLayout(GAME_AREAS.shop);
  const { slotSize, gap, top, sellItemsTop, sellX, purchaseX } = layout.transaction;
  const soldItems = getShopSoldItems(bag, transaction);
  for (let index = 0; index < soldItems.length; index += 1) {
    const entry = findAtPoint(point, soldItems[index], sellX + index * (slotSize + gap), sellItemsTop);
    if (entry) return entry;
  }
  for (const { column, row, item } of getRevealedPurchaseEntries(transaction)) {
    const entry = findAtPoint(point, item, purchaseX + (column - 1) * (slotSize + gap), top + row * (slotSize + gap));
    if (entry) return entry;
  }
  return null;
}

export function getShopTagAtPoint(point, shop, bag, transaction) {
  if (!shop) return null;
  const layout = getShopLayout(GAME_AREAS.shop);
  return getShopTrendTagAtPoint(point, shop, layout)
    ?? getShopEquipmentEntryAtPoint(point, bag, transaction, getEquipmentSlotTagAtPoint);
}

export function getShopItemAtPoint(point, shop, bag, transaction) {
  if (!shop) return null;
  const { bagX, bagY } = getShopLayout(GAME_AREAS.shop).transaction;
  if (bag && isPointInRect(point, bagX, bagY, SHOP_BAG_SIZE, SHOP_BAG_SIZE)) return bag;
  return getShopEquipmentEntryAtPoint(point, bag, transaction, getEquipmentSlotItemAtPoint);
}
