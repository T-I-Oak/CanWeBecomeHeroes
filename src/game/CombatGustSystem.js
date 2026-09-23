import { GAME_AREAS } from './GameAreas.js';
import { isHeroCombatant } from './CombatParticipant.js';

const GUST_FLIGHT_STEP_COUNT = 1;

function firstWeapon(hero) {
  return [hero.equipment.rightHand, hero.equipment.leftHand]
    .find((item) => item?.category === 'weapon') ?? null;
}

function dropPosition(center, item, index, count) {
  const angle = Math.PI * 2 * index / Math.max(1, count);
  const distance = Math.max(72, item.chip.radius * 3);
  return {
    x: center.x + Math.cos(angle) * distance,
    y: center.y + Math.sin(angle) * distance,
  };
}

/**
 * Resolves the temporary warehouse displacement caused by the feather Ex skill.
 * The system only owns the gust flight and equipment drop. Once landed, the
 * ordinary item pickup controller owns the hero's next destination.
 */
export default class CombatGustSystem {
  constructor({ board, controller, pickupController, returnSystem, getWarehouseDropPosition, clearCombatant = () => {} }) {
    Object.assign(this, { board, controller, pickupController, returnSystem, getWarehouseDropPosition, clearCombatant });
    this.gusting = new Map();
  }

  isGusting(combatant) { return this.gusting.has(combatant); }

  begin(target) {
    if (!isHeroCombatant(target) || target.currentArea !== 'battle' || target.targetArea) return false;
    const center = this.getWarehouseDropPosition();
    const destinationItem = firstWeapon(target);
    const equipment = target.clearEquipment();
    this.pickupController.leaveForWarehouse(target);
    target.clearBattleState?.();
    this.clearCombatant(target);
    target.chip.bounds = { ...GAME_AREAS.warehouse };
    equipment.forEach((item, index) => {
      Object.assign(item.chip, dropPosition(center, item, index, equipment.length));
      this.controller.addToWarehouse(item);
    });
    this.board.moveTo(target.chip, center.x, center.y, { animationStepCount: GUST_FLIGHT_STEP_COUNT });
    this.gusting.set(target, { destinationItem });
    return true;
  }

  update() {
    this.gusting.forEach((state, target) => {
      if (target.chip.step) return;
      this.gusting.delete(target);
      if (target.stamina < 3) {
        this.returnSystem?.begin(target);
        return;
      }
      this.pickupController.start(target, state.destinationItem);
    });
  }
}
