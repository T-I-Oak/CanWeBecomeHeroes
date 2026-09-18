import test from 'node:test';
import assert from 'node:assert/strict';
import RunController, { TRIAL_FINAL_STAGE_NUMBER } from '../../src/game/RunController.js';
import { unlockClearedTrialMembers } from '../../src/game/TrialCompletionProgress.js';
import StartPartySelection from '../../src/game/StartPartySelection.js';
import { createRunScenario } from '../../src/game/RunScenario.js';

test('試験ゲームランは第7試験のボス勝利で合格となり、その時点の仲間を解放する', () => {
  const run = new RunController();
  const members = [{ profession: 'swordfighter' }, { profession: 'mage' }, { profession: 'guard' }];
  const unlocked = [];

  run.update({
    remainingHours: 0,
    stage: { number: TRIAL_FINAL_STAGE_NUMBER, kind: 'boss' },
    stageState: 'victory',
  });

  assert.deepEqual(run.getOutcome(), { state: 'cleared', stageNumber: 7, stageKind: 'boss' });
  assert.equal(unlockClearedTrialMembers({
    wasRunActive: true,
    runController: run,
    members,
    heroProgress: { unlockMany: (professions) => unlocked.push(...professions) },
  }), true);
  assert.deepEqual(unlocked, ['swordfighter', 'mage', 'guard']);
});

test('試験ゲームランは最終ボス勝利前に期限切れなら不合格となる', () => {
  const run = new RunController();

  run.update({ remainingHours: 0, stage: { number: 6, kind: 'boss' }, stageState: 'victory' });

  assert.deepEqual(run.getOutcome(), { state: 'expired', stageNumber: 6, stageKind: 'boss' });
});

test('解放済みHeroから選んだ2人で開始し、それぞれ2組ずつの初期装備を倉庫へ追加する', () => {
  const selection = new StartPartySelection({ unlockedProfessionIds: ['swordfighter', 'guard', 'mage'] });
  selection.selectRosterHero('mage');
  const heroes = [];
  const warehouseItems = [];

  createRunScenario({ professionIds: selection.professionIds, random: () => 0 }).initialize({
    controller: {
      add: (hero) => heroes.push(hero),
      addToWarehouse: (item) => warehouseItems.push(item),
    },
  });

  assert.deepEqual(heroes.map((hero) => hero.profession), ['mage', 'swordfighter']);
  assert.equal(warehouseItems.filter((item) => item.category !== 'destination').length, 20);
});
