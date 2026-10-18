import test from 'node:test';
import assert from 'node:assert/strict';
import BattleSystem from '../../../src/game/BattleSystem.js';
import EnemyFactory from '../../../src/game/EnemyFactory.js';
import EnemySpawnSystem from '../../../src/game/EnemySpawnSystem.js';
import StageController, { getStageBaseLevel, rollStageLevel } from '../../../src/game/StageController.js';
import RunController from '../../../src/game/RunController.js';

test('final stage records its clear immediately, waits, and is not recorded twice on completion', () => {
  const events = [];
  let complete = false;
  const stages = new StageController({
    enemySpawn: {},
    battleSystem: { isStageComplete: () => complete, hasStageVictory: () => true },
    onStatistics: event => events.push(event),
    now: () => '2026-10-16T01:00:00.000Z',
  });
  stages.currentStage = { number: 7, kind: 'boss', patternIndex: 0, level: 9 };
  stages.state = 'battle';
  const run = new RunController();
  stages.update();
  run.update({ remainingHours: 1, stage: stages.currentStage, stageState: stages.state });
  assert.deepEqual(events, [{ type: 'stage-clear', kind: 'boss', patternIndex: 0, level: 9, clearedAt: '2026-10-16T01:00:00.000Z' }]);
  assert.equal(run.isActive, true);
  complete = true;
  stages.update();
  run.update({ remainingHours: 1, stage: stages.currentStage, stageState: stages.state });
  assert.equal(events.length, 1);
  assert.equal(run.state, 'cleared');
});

test('stage one rolls a level from one through five', () => {
  assert.equal(getStageBaseLevel(1), 3);
  assert.equal(getStageBaseLevel(7), 9);
  assert.equal(rollStageLevel(1, () => 0), 1);
  assert.equal(rollStageLevel(1, () => 0.5), 3);
  assert.equal(rollStageLevel(1, () => 0.999), 5);
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
