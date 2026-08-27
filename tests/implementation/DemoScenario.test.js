import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoScenario } from '../../src/demo/DemoScenario.js';

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
  assert.equal(entities.length, 2);
  assert.equal(typeof result.random, 'function');
});
