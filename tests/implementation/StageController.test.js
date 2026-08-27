import test from 'node:test';
import assert from 'node:assert/strict';
import BattleSystem from '../../src/game/BattleSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import EnemySpawnSystem from '../../src/game/EnemySpawnSystem.js';
import ShopState from '../../src/game/ShopState.js';
import StageController, { getStageBaseLevel, REGULAR_STAGE_KIND, rollStageLevel } from '../../src/game/StageController.js';

test('stage one rolls a level from one through five', () => {
  assert.equal(getStageBaseLevel(1), 3);
  assert.equal(getStageBaseLevel(7), 9);
  assert.equal(rollStageLevel(1, () => 0), 1);
  assert.equal(rollStageLevel(1, () => 0.5), 3);
  assert.equal(rollStageLevel(1, () => 0.999), 5);
});

test('stage controller prepares three frozen route choices and starts only the selected choice', () => {
  const added = [];
  const enemySpawn = new EnemySpawnSystem({ add: (enemy) => added.push(enemy) });
  const battleSystem = new BattleSystem({ chips: [] }, { controller: {}, itemFactory: {} });
  const shop = new ShopState({ saleTag: 'valor', nextTag: 'iron' });
  const stages = new StageController({ enemySpawn, battleSystem, enemyFactory: new EnemyFactory(), shopState: shop, random: () => 0.5 });

  const choices = stages.createStageChoices({ stageNumber: 1 });

  assert.equal(stages.state, 'selecting');
  assert.equal(choices.length, 3);
  assert.ok(choices.every((choice) => choice.kind === REGULAR_STAGE_KIND));
  assert.equal(added.length, 0);
  assert.ok(choices.every((choice) => choice.enemies.length === 2 && choice.shopTrends.saleTag));
  const stage = stages.selectStage(choices[1].id, { tick: 500 });
  assert.equal(stage.id, choices[1].id);
  assert.equal(stages.state, 'spawning');
  assert.equal(shop.saleTag, choices[1].shopTrends.saleTag);
  assert.equal(shop.nextTag, choices[1].shopTrends.nextTag);
  enemySpawn.update(699);
  assert.equal(added.length, 0);
  enemySpawn.update(700);
  assert.equal(added.length, 1);
});

test('stage controller creates and schedules a regular stage from its rolled level', () => {
  const added = [];
  const enemySpawn = new EnemySpawnSystem({ add: (enemy) => added.push(enemy) });
  const battleSystem = new BattleSystem({ chips: [] }, { controller: {}, itemFactory: {} });
  const stages = new StageController({ enemySpawn, battleSystem, enemyFactory: new EnemyFactory(), random: () => 0.5 });

  const stage = stages.startStage({ stageNumber: 1, tick: 1000 });

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
