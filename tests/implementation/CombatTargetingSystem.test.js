import test from 'node:test';
import assert from 'node:assert/strict';
import CombatTargetingSystem from '../../src/game/CombatTargetingSystem.js';

function combatant(type, x, equipment = []) {
  return {
    chip: { type, x, y: 0 },
    equipment,
    getCarriedWeight: () => 0,
    getTagCount: () => 0,
  };
}

test('a bewildered combatant targets another active ally and never itself', () => {
  const actor = combatant('hero', 0, [{ category: 'weapon', type: 'sword' }]);
  const ally = combatant('hero', 10);
  const opponent = combatant('enemy', 20);
  const board = { chips: [actor.chip, ally.chip, opponent.chip] };
  const targeting = new CombatTargetingSystem(board, { isBewildered: (candidate) => candidate === actor });

  assert.equal(targeting.findTarget(actor, [actor, ally, opponent]), ally);
});
