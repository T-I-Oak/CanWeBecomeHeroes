import test from 'node:test';
import assert from 'node:assert/strict';
import EntityRegistry from '../../src/game/EntityRegistry.js';

test('registerTree retains equipment and bag items until their owner is destroyed', () => {
  const registry = new EntityRegistry();
  const sword = { chip: { type: 'item' } };
  const potionBag = { chip: { type: 'item' }, storedItems: [sword] };
  const hero = { chip: { type: 'hero' }, equipment: { rightHand: potionBag } };

  registry.registerTree(hero);
  assert.equal(registry.isAlive(hero), true);
  assert.equal(registry.isAlive(potionBag), true);
  assert.equal(registry.isAlive(sword), true);

  registry.destroy(hero, { includeRelated: true });
  assert.equal(registry.isAlive(hero), false);
  assert.equal(registry.isAlive(potionBag), false);
  assert.equal(registry.isAlive(sword), false);
});
