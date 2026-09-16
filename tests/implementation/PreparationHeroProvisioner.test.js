import test from 'node:test';
import assert from 'node:assert/strict';
import PreparationHeroProvisioner from '../../src/game/PreparationHeroProvisioner.js';
import { getPreparationSubareaBounds } from '../../src/game/GameAreas.js';

test('provisioning a preparation hero gives two matching equipment sets to the warehouse', () => {
  const heroes = [];
  const warehouseItems = [];
  const provisioner = new PreparationHeroProvisioner({
    controller: {
      add: (hero) => heroes.push(hero),
      addToWarehouse: (item) => warehouseItems.push(item),
    },
    random: () => 0,
  });

  const hero = provisioner.provision({ profession: 'mage', preparationIndex: 2 });
  const equipment = warehouseItems.filter((item) => item.category !== 'destination');

  assert.equal(heroes[0], hero);
  assert.equal(hero.profession, 'mage');
  assert.deepEqual(hero.preparationReturn.bounds, getPreparationSubareaBounds(2));
  assert.ok(hero.chip.height > 0);
  assert.equal(hero.chip.impactOnLanding, true);
  assert.equal(equipment.length, 10);
  assert.equal(equipment.reduce((total, item) => total + item.tags.length, 0), 10);
});
