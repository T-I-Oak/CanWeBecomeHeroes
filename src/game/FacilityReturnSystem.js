import { GAME_AREAS } from './GameAreas.js';

export default class FacilityReturnSystem {
  constructor(board, slotManager, { onItemReturned = () => {}, random = Math.random } = {}) {
    this.board = board;
    this.slotManager = slotManager;
    this.onItemReturned = onItemReturned;
    this.random = random;
    this.returning = new Set();
  }

  begin(hero) {
    const target = hero.preparationReturn;
    if (!target) throw new Error('Facility return requires a preparation return position.');
    this.slotManager.release(hero);
    hero.clearBattleState?.();
    hero.clearEquipment().filter((item) => item.category === 'destination').forEach((item) => {
      const area = GAME_AREAS.warehouse;
      item.chip.x = area.x + item.chip.radius + this.random() * (area.width - item.chip.radius * 2);
      item.chip.y = area.y + item.chip.radius + this.random() * (area.height - item.chip.radius * 2);
      item.chip.scale = 1;
      item.chip.isPickupTarget = false;
      item.chip.isAbsorbing = false;
      item.chip.bounds = { ...area };
      this.onItemReturned(item);
    });
    hero.chip.bounds = null;
    hero.targetArea = 'preparation';
    this.returning.add(hero);
    this.board.moveTo(hero.chip, target.x, target.y, { stepDistance: hero.getStepDistance() });
  }

  update(hero) {
    if (!this.returning.has(hero) || hero.chip.step) return false;
    const target = hero.preparationReturn;
    if (Math.hypot(hero.chip.x - target.x, hero.chip.y - target.y) > 0.01) {
      this.board.moveTo(hero.chip, target.x, target.y, { stepDistance: hero.getStepDistance() });
      return false;
    }
    hero.chip.bounds = { ...target.bounds };
    hero.currentArea = 'preparation';
    hero.targetArea = null;
    this.returning.delete(hero);
    return true;
  }
}
