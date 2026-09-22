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

export function drawShopPanel({ context, assets, snapshot, texts, layout, drawItemSlot, drawFramedTag, getTagBaseColors, getTagGlyphScales, arrowWidth }) {
  if (!snapshot) return;
  const drawTrend = (label, tag, board) => { const centerX = board.x + board.width / 2; context.fillStyle = '#263b2a'; context.strokeStyle = '#9b7142'; context.lineWidth = 4; context.beginPath(); context.roundRect(board.x, board.y, board.width, board.height, 8); context.fill(); context.stroke(); context.fillStyle = '#f2e8c8'; context.font = 'bold 16px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(label, centerX, board.y + 26); drawFramedTag(context, assets, `/assets/tags/${tag}.png`, getTagBaseColors([tag])[0], getTagGlyphScales([tag])[0], centerX - 24, board.y + 44, 48); };
  drawTrend(texts.getLabel('shopSale'), snapshot.saleTag, layout.saleBoards.sale); drawTrend(texts.getLabel('shopNext'), snapshot.nextTag, layout.saleBoards.next);
  const { slotSize, gap, top, sellItemsTop, bagX, bagY, sellX, arrowX, purchaseX } = layout.transaction; const bagImage = assets.load('/assets/items/hand-shopping-bag.png'); if (bagImage.complete && bagImage.naturalWidth > 0) context.drawImage(bagImage, bagX, bagY, 48, 48);
  snapshot.soldItems.forEach((item, index) => drawItemSlot(context, assets, item, sellX + index * (slotSize + gap), sellItemsTop));
  SHOP_PURCHASE_SLOT_GRID.forEach(([column, row], index) => drawItemSlot(context, assets, index < snapshot.purchases.length ? snapshot.purchases[index].item : null, purchaseX + (column - 1) * (slotSize + gap), top + row * (slotSize + gap)));
  const arrowY = sellItemsTop + slotSize / 2; context.fillStyle = '#f7f0d7'; context.strokeStyle = '#9b7142'; context.lineWidth = 3; context.beginPath(); context.moveTo(arrowX, arrowY - 15); context.lineTo(arrowX + arrowWidth - 14, arrowY - 15); context.lineTo(arrowX + arrowWidth - 14, arrowY - 30); context.lineTo(arrowX + arrowWidth, arrowY); context.lineTo(arrowX + arrowWidth - 14, arrowY + 30); context.lineTo(arrowX + arrowWidth - 14, arrowY + 15); context.lineTo(arrowX, arrowY + 15); context.closePath(); context.fill(); context.stroke(); context.textAlign = 'start'; context.textBaseline = 'alphabetic';
}
