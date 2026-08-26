import { HERO_SLOT_SIZE } from './HeroSlotLayout.js';
import { PREPARATION_LAYOUT } from './PreparationLayout.js';
import { FACILITY_LAYOUT, getFacilitySlotOrigin } from './FacilityLayout.js';

export const SHOP_CUSTOMER_WIDTH = HERO_SLOT_SIZE + 112;
export const SHOP_COUNTER_WIDTH = 64;
export const SHOP_BAG_ROW_GAP = 12;
export const SHOP_BAG_ROW_HEIGHT = 72;
export const SHOP_TRANSACTION_PADDING = 12;
export const SHOP_TRANSACTION_ARROW_WIDTH = 44;
export const SHOP_SALE_BOARD_WIDTH = 176;
export const SHOP_SALE_BOARD_GAP = 8;
export const SHOP_SALE_BOARD_HEIGHT = 108;
export const SHOP_BAG_ICON_SIZE = 48;
export const SHOP_HERO_SLOT_LEFT = FACILITY_LAYOUT.slotLeft;
export const SHOP_HERO_SLOT_TOP = FACILITY_LAYOUT.shopSlotTop;
export const SHOP_SALE_BOARD_LEFT = 320;
export const SHOP_SALE_BOARD_TOP = 16;
export const SHOP_NEXT_BOARD_WIDTH = 72;
export const SHOP_SELL_SLOT_LEFT = 64;
export const SHOP_SELL_SLOT_TOP = 324;

export function getShopLayout(area) {
  const storeWidth = area.width - SHOP_CUSTOMER_WIDTH - SHOP_COUNTER_WIDTH;
  const customer = { x: area.x, y: area.y, width: SHOP_CUSTOMER_WIDTH, height: area.height };
  const counter = { x: customer.x + customer.width, y: area.y, width: SHOP_COUNTER_WIDTH, height: area.height };
  const store = { x: counter.x + counter.width, y: area.y, width: storeWidth, height: area.height };
  const { x: heroSlotX, y: heroSlotY } = getFacilitySlotOrigin('shop');
  const saleBoardGroupX = area.x + SHOP_SALE_BOARD_LEFT;
  const transactionSlotSize = PREPARATION_LAYOUT.equipmentSlotSize;
  const transactionGap = PREPARATION_LAYOUT.equipmentGap;
  const purchaseX = area.x + 424;
  const sellX = area.x + SHOP_SELL_SLOT_LEFT;
  const boardWidth = SHOP_SALE_BOARD_WIDTH;
  return Object.freeze({
    customer,
    counter,
    store,
    heroSlot: Object.freeze({ x: heroSlotX, y: heroSlotY }),
    bagRowY: heroSlotY + HERO_SLOT_SIZE + SHOP_BAG_ROW_GAP,
    saleBoards: Object.freeze({
      sale: Object.freeze({ x: saleBoardGroupX, y: area.y + SHOP_SALE_BOARD_TOP, width: boardWidth, height: SHOP_SALE_BOARD_HEIGHT }),
      next: Object.freeze({ x: saleBoardGroupX + SHOP_SALE_BOARD_WIDTH + SHOP_SALE_BOARD_GAP, y: area.y + SHOP_SALE_BOARD_TOP, width: SHOP_NEXT_BOARD_WIDTH, height: SHOP_SALE_BOARD_HEIGHT }),
    }),
    transaction: Object.freeze({
      slotSize: transactionSlotSize,
      gap: transactionGap,
      top: area.y + 164,
      sellItemsTop: area.y + SHOP_SELL_SLOT_TOP,
      bagX: area.x + SHOP_SELL_SLOT_LEFT - SHOP_TRANSACTION_PADDING - SHOP_BAG_ICON_SIZE,
      bagY: area.y + SHOP_SELL_SLOT_TOP + (transactionSlotSize - SHOP_BAG_ICON_SIZE) / 2,
      horizontalShift: 0,
      sellX,
      arrowX: area.x + 304,
      purchaseX,
    }),
  });
}
