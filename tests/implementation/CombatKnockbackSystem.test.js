import test from 'node:test';
import assert from 'node:assert/strict';
import Chip from '../../src/chips/Chip.js';
import ChipBoard from '../../src/chips/ChipBoard.js';
import CombatKnockbackSystem, { getIronCounterblowDistance } from '../../src/game/CombatKnockbackSystem.js';
import { GAME_AREAS, WORLD_SIZE } from '../../src/game/GameAreas.js';
import { HERO_SLOT_SIZE } from '../../src/game/HeroSlotLayout.js';

function createCombatant(board, carriedWeight = 0) {
  const bounds = { x: GAME_AREAS.battle.x, y: GAME_AREAS.battle.y + 100, width: HERO_SLOT_SIZE, height: HERO_SLOT_SIZE };
  const chip = board.addChip(new Chip({
    id: 0,
    type: 'hero',
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
    weight: 1,
    centerPath: '',
    tagPaths: [],
    bounds,
  }));
  chip.height = 0;
  chip.verticalVelocity = 0;
  return { chip, getCarriedWeight: () => carriedWeight };
}

test('iron counterblow uses the specified fixed and damage-based distance', () => {
  assert.equal(getIronCounterblowDistance(100, 1), HERO_SLOT_SIZE * 1.5);
  assert.equal(getIronCounterblowDistance(100, 2), HERO_SLOT_SIZE * 3);
});

test('counterblow launches in one motion after an action resolves, then returns by weight-based steps', () => {
  const board = new ChipBoard(WORLD_SIZE);
  const combatant = createCombatant(board, 25);
  const system = new CombatKnockbackSystem(board);
  const originalBounds = { ...combatant.chip.bounds };
  const originalPosition = { x: combatant.chip.x, y: combatant.chip.y };

  system.beginAction();
  system.queueIronCounterblow({ actor: combatant, target: {}, damage: 100, level: 1 });
  assert.equal(system.isKnockedBack(combatant), false);

  system.resolveAction();
  assert.equal(system.isKnockedBack(combatant), true);
  assert.equal(combatant.chip.step.targetY, originalPosition.y + HERO_SLOT_SIZE * 1.5);
  assert.equal(combatant.chip.step.stepCount, 1);

  combatant.chip.x = originalPosition.x;
  combatant.chip.y = originalPosition.y + HERO_SLOT_SIZE * 1.5;
  combatant.chip.step = null;
  system.update();
  assert.equal(combatant.chip.y - combatant.chip.step.targetY, 48);

  combatant.chip.x = originalPosition.x;
  combatant.chip.y = originalPosition.y;
  combatant.chip.step = null;
  system.update();
  assert.equal(system.isKnockedBack(combatant), false);
  assert.deepEqual(combatant.chip.bounds, originalBounds);
});
