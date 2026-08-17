import test from 'node:test';
import assert from 'node:assert/strict';
import Chip from '../../src/chips/Chip.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';

function hero(id) {
  return { chip: new Chip({ id, type: 'hero', x: 0, y: 0, weight: 1, centerPath: '', tagPaths: [] }), targetSlotId: null, currentSlotId: null };
}

test('battle slots reserve in 2, 3, 1, 4 order and reservations block duplicates', () => {
  const manager = new HeroSlotManager();
  const heroes = [hero(1), hero(2), hero(3), hero(4)];
  assert.deepEqual(heroes.map((current) => manager.reserve(current, 'battle').id), ['battle-2', 'battle-3', 'battle-1', 'battle-4']);
  assert.equal(manager.reserve(hero(5), 'battle'), null);
});

test('arrival records the current slot on the hero', () => {
  const manager = new HeroSlotManager();
  const currentHero = hero(1);
  manager.reserve(currentHero, 'shop');
  assert.equal(currentHero.targetSlotId, 'shop-1');
  assert.equal(manager.arrive(currentHero), true);
  assert.equal(currentHero.targetSlotId, null);
  assert.equal(currentHero.currentSlotId, 'shop-1');
  assert.equal(currentHero.chip.bounds.width > currentHero.chip.radius * 2, true);
});
