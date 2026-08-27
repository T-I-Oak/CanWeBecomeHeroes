import test from 'node:test';
import assert from 'node:assert/strict';
import BattleSystem from '../../src/game/BattleSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import EnemySpawnSystem from '../../src/game/EnemySpawnSystem.js';
import StageController, { getStageBaseLevel, rollStageLevel } from '../../src/game/StageController.js';

test('stage one has base level three and rolls within two levels', () => {
  assert.equal(getStageBaseLevel(1), 3);
  assert.equal(getStageBaseLevel(7), 9);
  assert.equal(rollStageLevel(1, () => 0), 1);
  assert.equal(rollStageLevel(1, () => 0.5), 3);
  assert.equal(rollStageLevel(1, () => 0.999), 5);
});

test('stage controller creates and schedules a normal stage from its rolled level', () => {
  const added = [];
  const enemySpawn = new EnemySpawnSystem({ add: (enemy) => added.push(enemy) });
  const battleSystem = new BattleSystem({ chips: [] }, { controller: {}, itemFactory: {} });
  const stages = new StageController({ enemySpawn, battleSystem, enemyFactory: new EnemyFactory(), random: () => 0.5 });

  const stage = stages.startNormalStage({ stageNumber: 1, tick: 1000 });

  assert.equal(stage.baseLevel, 3);
  assert.equal(stage.level, 3);
  assert.equal(stage.enemies.length, 2);
  assert.deepEqual(stage.enemies.map((enemy) => enemy.slotPosition), [3, 4]);
  assert.equal(stages.state, 'spawning');
  enemySpawn.update(1199);
  assert.equal(added.length, 0);
  enemySpawn.update(1200);
  assert.equal(added.length, 1);

  battleSystem.victoryTick = 1201;
  stages.update();
  assert.equal(stages.state, 'victory');
  battleSystem.stageCompleteTick = 1401;
  stages.update();
  assert.equal(stages.state, 'complete');
});
