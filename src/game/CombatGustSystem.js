import { GAME_AREAS } from './GameAreas.js';
import { isHeroCombatant } from './CombatParticipant.js';

function firstWeapon(hero) {
  return [hero.equipment.rightHand, hero.equipment.leftHand]
    .find((item) => item?.category === 'weapon') ?? null;
}

function dropPosition(center, item, index, count, heroRadius, rotation, random) {
  const sector = Math.PI * 2 / count;
  const angle = rotation + sector * (index + (random() - 0.5) * 0.6);
  const distance = (heroRadius * 2 + item.chip.radius) * (1 + random() * 0.5);
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
  constructor({ board, controller, pickupController, returnSystem, getWarehouseDropPosition, clearCombatant = () => {}, random = Math.random }) {
    Object.assign(this, { board, controller, pickupController, returnSystem, getWarehouseDropPosition, clearCombatant, random });
    this.gusting = new Map();
  }

  isGusting(combatant) { return this.gusting.has(combatant); }

  begin(target) {
    if (!isHeroCombatant(target) || target.currentArea !== 'battle' || target.targetArea) return false;
    const center = this.getWarehouseDropPosition();
    const area = GAME_AREAS.warehouse;
    const destinationItem = firstWeapon(target);
    const equipment = target.clearEquipment();
    const radius = target.chip.radius;
    const margin = Math.max(radius, radius * 3 + Math.max(0, ...equipment.map((item) => item.chip.radius)) * 2.5);
    center.x = Math.max(area.x + margin, Math.min(area.x + area.width - margin, center.x));
    center.y = Math.max(area.y + margin, Math.min(area.y + area.height - margin, center.y));
    this.pickupController.leaveForWarehouse(target);
    target.clearBattleState?.();
    this.clearCombatant(target);
    this.board.launchUp(target.chip, center);
    const rotation = this.random() * Math.PI * 2;
    const flyingEquipment = equipment.map((item, index) => {
      const position = dropPosition(center, item, index, equipment.length, radius, rotation, this.random);
      this.board.addChip(item.chip);
      item.chip.isTransferVisual = true;
      item.chip.isAbsorbing = true;
      item.chip.height = 0;
      item.chip.verticalVelocity = 0;
      item.chip.scale = 1;
      return { item, offsetX: position.x - center.x, offsetY: position.y - center.y };
    });
    const state = { destinationItem, flyingEquipment, phase: 'rising' };
    this.updateFlyingEquipment(target, state, 0);
    this.gusting.set(target, state);
    return true;
  }

  updateFlyingEquipment(target, state, progress) {
    const spread = progress;
    state.flyingEquipment.forEach(({ item, offsetX, offsetY }) => {
      item.chip.x = target.chip.x + offsetX * spread;
      item.chip.y = target.chip.y + offsetY * spread;
      item.chip.height = target.chip.height;
    });
  }

  update() {
    this.gusting.forEach((state, target) => {
      if (state.phase === 'rising') {
        const rise = target.chip.rise;
        this.updateFlyingEquipment(target, state, rise ? rise.elapsed / rise.duration : 1);
        if (target.chip.rise) return;
        target.chip.bounds = { ...GAME_AREAS.warehouse };
        target.chip.beginDrop();
        state.flyingEquipment.forEach(({ item }) => {
          this.board.removeChip(item.chip);
          item.chip.isTransferVisual = false;
          item.chip.isAbsorbing = false;
          this.controller.addToWarehouse(item);
          item.chip.height = target.chip.height;
        });
        state.phase = 'falling';
        return;
      }
      if (!target.chip.isSettled) return;
      this.gusting.delete(target);
      if (target.stamina < 3) {
        this.returnSystem?.begin(target);
        return;
      }
      this.pickupController.start(target, state.destinationItem);
    });
  }
}
