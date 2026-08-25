import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoScenario } from '../../src/demo/DemoScenario.js';
import { HERO_SLOT_SIZE } from '../../src/game/HeroSlotLayout.js';

test('demo starts two distinct heroes with four five-item trend sets in the warehouse', () => {
  const entities = [];
  const warehouseItems = [];
  const scenario = createDemoScenario({ random: () => 0 });
  const result = scenario.initialize({
    controller: {
      add: (entity) => entities.push(entity),
      addToWarehouse: (item) => warehouseItems.push(item),
    },
  });

  assert.equal(result.preparationHeroes.length, 2);
  assert.notEqual(result.preparationHeroes[0].profession, result.preparationHeroes[1].profession);
  const equipment = warehouseItems.filter((item) => item.category !== 'destination');
  assert.equal(equipment.length, 20);
  Array.from({ length: 4 }, (_, index) => equipment.slice(index * 5, index * 5 + 5)).forEach((set) => {
    assert.equal(set.reduce((total, item) => total + item.tags.length, 0), 5);
  });
  assert.equal(warehouseItems.filter((item) => item.category === 'destination').length, 3);
  assert.equal(entities.length, 4);
  assert.deepEqual(result.enemies.map((enemy) => [enemy.definition.nameJa, enemy.mainTag]), [
    ['ゴブリン', 'valor'],
    ['リビングアーマー', 'iron'],
  ]);
  assert.equal(result.enemies[1].chip.x - result.enemies[0].chip.x, HERO_SLOT_SIZE);
});
