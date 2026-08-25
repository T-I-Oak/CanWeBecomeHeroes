import test from 'node:test';
import assert from 'node:assert/strict';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import EnemySpawnSystem from '../../src/game/EnemySpawnSystem.js';

test('enemy spawns follow the outer-to-center slot order with fixed empty-slot delays', () => {
  const added = [];
  const spawn = new EnemySpawnSystem({ add: (enemy) => added.push(enemy) });
  const factory = new EnemyFactory();
  const slotThree = factory.createInitialEncounter();
  const slotFour = factory.createInitialLivingArmor();
  spawn.schedule([slotFour, slotThree]);

  spawn.update(199);
  assert.equal(added.length, 0);
  spawn.update(200);
  assert.deepEqual(added, [slotThree]);
  spawn.update(249);
  assert.deepEqual(added, [slotThree]);
  spawn.update(250);
  assert.deepEqual(added, [slotThree, slotFour]);
});
