import test from 'node:test';
import assert from 'node:assert/strict';
import { createRunScenario } from '../../src/game/RunScenario.js';

test('run starts only the selected heroes and gives each two equipment sets', () => {
  const heroes = [];
  const items = [];
  const scenario = createRunScenario({ professionIds: ['swordfighter', 'mage'], random: () => 0 });
  const result = scenario.initialize({ controller: { add: (hero) => heroes.push(hero), addToWarehouse: (item) => items.push(item) } });

  assert.deepEqual(result.preparationHeroes.map((hero) => hero.profession), ['swordfighter', 'mage']);
  assert.equal(items.filter((item) => item.category !== 'destination').length, 20);
  assert.equal(items.filter((item) => item.category === 'destination').length, 3);
});
