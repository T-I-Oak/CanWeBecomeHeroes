import { WORLD_SIZE, GAME_AREAS } from './GameAreas.js';
import { HERO_SLOT_SIZE } from './HeroSlotLayout.js';
import { getCharacterStepDistance } from './MovementSettings.js';

export const IRON_COUNTERBLOW_DISTANCE = Object.freeze({
  fixed: HERO_SLOT_SIZE / 2,
  perDamage: HERO_SLOT_SIZE / 100,
  levelMultiplier: Object.freeze({ 1: 1, 2: 2 }),
});

function getSlotCenter(bounds, chip) {
  if (!bounds) return Object.freeze({ x: chip.x, y: chip.y });
  return Object.freeze({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 });
}

export function getIronCounterblowDistance(damage, level) {
  const multiplier = IRON_COUNTERBLOW_DISTANCE.levelMultiplier[level];
  if (!multiplier) throw new RangeError(`Unsupported iron counterblow level: ${level}`);
  return (IRON_COUNTERBLOW_DISTANCE.fixed + Math.max(0, damage) * IRON_COUNTERBLOW_DISTANCE.perDamage) * multiplier;
}

export default class CombatKnockbackSystem {
  constructor(board) {
    this.board = board;
    this.states = new Map();
    this.pendingCounterblows = new Map();
  }

  beginAction() {
    this.pendingCounterblows.clear();
  }

  queueIronCounterblow({ actor, target, damage, level }) {
    if (!actor || !target || damage <= 0) return;
    const pending = this.pendingCounterblows.get(actor) ?? { distance: 0 };
    pending.distance = Math.max(pending.distance, getIronCounterblowDistance(damage, level));
    this.pendingCounterblows.set(actor, pending);
  }

  resolveAction() {
    this.pendingCounterblows.forEach(({ distance }, actor) => this.begin(actor, distance));
    this.pendingCounterblows.clear();
  }

  begin(combatant, distance) {
    if (!combatant || this.states.has(combatant)) return false;
    const { chip } = combatant;
    const originalBounds = chip.bounds && { ...chip.bounds };
    const originalPosition = getSlotCenter(originalBounds, chip);
    chip.bounds = { x: GAME_AREAS.battle.x, y: GAME_AREAS.battle.y, width: GAME_AREAS.battle.width, height: WORLD_SIZE.height - GAME_AREAS.battle.y };
    this.states.set(combatant, { originalBounds, originalPosition, phase: 'outbound' });
    this.board.moveTo(chip, originalPosition.x, originalPosition.y + distance, { animationStepCount: 1 });
    return true;
  }

  update() {
    this.states.forEach((state, combatant) => {
      if (!combatant.chip.isSettled) return;
      if (state.phase === 'outbound') {
        state.phase = 'returning';
        this.moveBackOneStep(combatant, state.originalPosition);
        return;
      }
      if (Math.hypot(combatant.chip.x - state.originalPosition.x, combatant.chip.y - state.originalPosition.y) > 0.01) {
        this.moveBackOneStep(combatant, state.originalPosition);
        return;
      }
      combatant.chip.bounds = state.originalBounds;
      this.states.delete(combatant);
    });
  }

  isKnockedBack(combatant) {
    return this.states.has(combatant);
  }

  moveBackOneStep(combatant, originalPosition) {
    const stepDistance = combatant.getStepDistance?.() ?? getCharacterStepDistance(combatant.getCarriedWeight?.() ?? 0);
    this.board.moveTo(combatant.chip, originalPosition.x, originalPosition.y, { stepDistance });
  }

  cancel(combatant) {
    this.states.delete(combatant);
    this.pendingCounterblows.delete(combatant);
  }
}
