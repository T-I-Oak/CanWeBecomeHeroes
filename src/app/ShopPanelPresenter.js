export const SHOP_PURCHASE_SLOT_GRID = Object.freeze([[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]);

export function getShopPurchasePresentation(transaction) {
  const setStart = (transaction?.deliveredSets ?? 0) * SHOP_PURCHASE_SLOT_GRID.length;
  return Object.freeze({ setStart, revealedCount: Math.max(0, (transaction?.revealed ?? 0) - setStart) });
}

export function getShopSoldItems(bag, transaction) {
  return Array.from({ length: 3 }, (_, index) => transaction?.soldItems[index] ?? bag?.storedItems[index] ?? null);
}

export function getRevealedPurchaseEntries(transaction) {
  const { setStart, revealedCount } = getShopPurchasePresentation(transaction);
  return SHOP_PURCHASE_SLOT_GRID.slice(0, revealedCount).map(([column, row], index) => ({ column, row, item: transaction?.purchases[setStart + index]?.item ?? null }));
}

export function getShopPanelSnapshot(shop, bag, transaction) {
  if (!shop) return null;
  return Object.freeze({ saleTag: shop.saleTag, nextTag: shop.nextTag, soldItems: getShopSoldItems(bag, transaction), purchases: getRevealedPurchaseEntries(transaction) });
}
