import ItemFactory from './ItemFactory.js';
import { GAME_AREAS } from './GameAreas.js';
import { EQUIPMENT_PARTS, createTrendEquipmentSet } from './TrendEquipmentGenerator.js';

// 暫定値。ゲーム時間で計測し、バランス調整時はこの定数だけを変更する。
export const SHOP_REVEAL_INTERVAL_TICKS = 100;
export const SHOP_PURCHASE_DELIVERY_TICKS = 600;
export const SHOP_SET_COUNT = 2;
const GAME_TICK_SECONDS = 1 / 60;
const PART_LABELS = Object.freeze({ head: '頭装備', torso: '胴装備', weapon: '手装備', feet: '脚装備' });

export function getSaleTagCount(value, negotiation) {
  return Math.min(15, Math.max(5, 5 + Math.floor(value / Math.max(1, 10 - negotiation))));
}

export function getGemAttempts(skillLevel) {
  return Object.freeze({ 0: 0, 1: 1, 3: 2, 5: 3, 7: 4 })[skillLevel] ?? 0;
}

export default class ShopSystem {
  constructor(board, shopState, returnSystem, { itemFactory = new ItemFactory(), onItemPurchased = () => {}, random = Math.random, gameLog = null } = {}) {
    this.board = board;
    this.shopState = shopState;
    this.returnSystem = returnSystem;
    this.itemFactory = itemFactory;
    this.onItemPurchased = onItemPurchased;
    this.random = random;
    this.gameLog = gameLog;
    this.states = new Map();
  }

  update(heroes, deltaSeconds) {
    heroes.forEach((hero) => {
      const state = this.states.get(hero);
      if (state?.returning) {
        if (this.returnSystem.update(hero)) this.states.delete(hero);
        return;
      }
      if (hero.currentArea !== 'shop') {
        this.states.delete(hero);
        return;
      }
      const shopState = state ?? this.beginTransaction(hero);
      this.states.set(hero, shopState);
      shopState.elapsed += deltaSeconds;
      while (shopState.elapsed >= GAME_TICK_SECONDS && !shopState.returning) {
        shopState.elapsed -= GAME_TICK_SECONDS;
        shopState.ticks += 1;
        this.updateTransactionTick(hero, shopState);
      }
    });
  }

  beginTransaction(hero) {
    const transaction = this.trade(hero);
    return { ...transaction, elapsed: 0, ticks: 0, revealed: 0, deliveredSets: 0, returning: false };
  }

  updateTransactionTick(hero, state) {
    if (state.ticks % SHOP_PURCHASE_DELIVERY_TICKS === 0) {
      this.deliverSet(hero, state);
      return;
    }
    if (state.ticks % SHOP_REVEAL_INTERVAL_TICKS === 0 && state.revealed < state.purchases.length) {
      const purchase = state.purchases[state.revealed];
      state.revealed += 1;
      if (purchase.enhanced) {
        this.gameLog?.log(`${hero.profession}・${hero.name.ja}は買った${PART_LABELS[purchase.part]}の隠れた能力を見つけた。`, { subject: 'hero', level: 'luck' });
      }
    }
  }

  deliverSet(hero, state) {
    const start = state.deliveredSets * EQUIPMENT_PARTS.length;
    state.purchases.slice(start, start + EQUIPMENT_PARTS.length).forEach(({ item }) => this.onItemPurchased(item));
    state.deliveredSets += 1;
    if (state.deliveredSets < SHOP_SET_COUNT) return;
    if (state.bag) state.bag.storedItems.length = 0;
    this.shopState.advance(this.random);
    this.gameLog?.log(`${hero.profession}・${hero.name.ja}はショップで買い物をした。`, { subject: 'hero', level: 'info' });
    hero.stamina = 0;
    state.returning = true;
    this.returnSystem.begin(hero);
  }

  getTransaction() {
    return [...this.states.values()].find((state) => !state.returning) ?? null;
  }

  trade(hero) {
    const bag = [hero.equipment.rightHand, hero.equipment.leftHand].find((item) => item?.isShoppingBag);
    const saleValue = (bag?.storedItems ?? []).reduce((total, item) => total + item.price, 0);
    const tagBudget = getSaleTagCount(saleValue, hero.getStatus('negotiation'));
    const purchases = Array.from({ length: SHOP_SET_COUNT }, () => this.createPurchaseSet(tagBudget, hero)).flat();
    return { bag, soldItems: [...(bag?.storedItems ?? [])], purchases };
  }

  createPurchaseSet(tagBudget, hero) {
    const dropCenter = this.getPurchaseDropCenter();
    const attempts = getGemAttempts(hero.getTagSkillLevel('gem'));
    return createTrendEquipmentSet({
      trendTag: this.shopState.saleTag,
      tagBudget,
      itemFactory: this.itemFactory,
      random: this.random,
      placePart: () => this.getPurchaseDropArea(dropCenter),
      modifyTagCount: ({ count }) => {
        const enhanced = count < 3 && Array.from({ length: attempts }, () => this.random() < hero.getLuckRate()).some(Boolean);
        return { count: enhanced ? count + 1 : count, enhanced };
      },
    });
  }

  getPurchaseDropCenter() {
    const warehouse = GAME_AREAS.warehouse;
    const margin = 100;
    return {
      x: warehouse.x + margin + this.random() * (warehouse.width - margin * 2),
      y: warehouse.y + margin + this.random() * (warehouse.height - margin * 2),
    };
  }

  getPurchaseDropArea(center) {
    const spread = 64;
    return { x: center.x + (this.random() - 0.5) * spread, y: center.y + (this.random() - 0.5) * spread };
  }
}
