import test from 'node:test';
import assert from 'node:assert/strict';
import RunController, { TRIAL_FINAL_STAGE_NUMBER } from '../../src/game/RunController.js';
import { unlockClearedTrialMembers } from '../../src/game/TrialCompletionProgress.js';
import StartPartySelection from '../../src/game/StartPartySelection.js';
import { createRunScenario } from '../../src/game/RunScenario.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import EnemySpawnSystem from '../../src/game/EnemySpawnSystem.js';
import ShopState from '../../src/game/ShopState.js';
import StageController from '../../src/game/StageController.js';
import EntityRegistry from '../../src/game/EntityRegistry.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import { TAGS } from '../../src/game/TagCatalog.js';
import {
  GAME_TICKS_PER_HOUR,
  getGuildTimeStatus,
  GUILD_TIMELINE_STANDARD_HOURS,
} from '../../src/game/GuildTime.js';

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

test('ゲームラン中に加入したHeroは、試験クリアーまで解放済みにならない', () => {
  const unlockCalls = [];
  const heroProgress = { unlockMany: (professionIds) => unlockCalls.push(professionIds) };
  const members = [{ profession: 'swordfighter' }, { profession: 'mage' }];

  assert.equal(unlockClearedTrialMembers({ wasRunActive: true, runController: { state: 'active' }, members, heroProgress }), false);
  assert.deepEqual(unlockCalls, []);
});

test('クリアー済みのゲームランは、その時点のメンバーを一度だけ解放する', () => {
  const unlockCalls = [];
  const heroProgress = { unlockMany: (professionIds) => unlockCalls.push(professionIds) };
  const members = [{ profession: 'swordfighter' }, { profession: 'mage' }];
  const clearedRun = { state: 'cleared' };

  assert.equal(unlockClearedTrialMembers({ wasRunActive: true, runController: clearedRun, members, heroProgress }), true);
  assert.equal(unlockClearedTrialMembers({ wasRunActive: false, runController: clearedRun, members, heroProgress }), false);
  assert.deepEqual(unlockCalls, [['swordfighter', 'mage']]);
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

test('第N試験は3件の課題候補から1件だけを選んで開始し、選ばなかった敵は出現しない', () => {
  const added = [];
  const enemySpawn = new EnemySpawnSystem({ add: (enemy) => added.push(enemy) });
  const battleSystem = new BattleSystem({ chips: [] }, { controller: {}, itemFactory: {} });
  const shop = new ShopState({ saleTag: 'valor', nextTag: 'iron' });
  const entityRegistry = new EntityRegistry();
  const stages = new StageController({ enemySpawn, battleSystem, enemyFactory: new EnemyFactory(), shopState: shop, entityRegistry, random: () => 0.5 });

  const choices = stages.createStageChoices({ stageNumber: 1 });
  const stage = stages.selectStage(choices[1].id, { tick: 500 });

  assert.equal(choices.length, 3);
  assert.equal(stage.id, choices[1].id);
  assert.equal(stages.state, 'spawning');
  assert.ok(stage.enemies.every((enemy) => entityRegistry.isAlive(enemy)));
  assert.ok(choices.filter((choice) => choice.id !== stage.id).flatMap((choice) => choice.enemies).every((enemy) => !entityRegistry.isAlive(enemy)));
  enemySpawn.update(700);
  assert.equal(added.length, 1);
});

test('試験期限は開始時に7日で、ギルド表示は残り期限と延長見込だけを示す', () => {
  const status = getGuildTimeStatus({ tick: GAME_TICKS_PER_HOUR * 25, contributionPoints: 200 });

  assert.equal(status.elapsedHours, 25);
  assert.equal(status.remainingHours, 143);
  assert.equal(status.estimatedExtensionHours, 24);
  assert.equal(status.timelineHours, GUILD_TIMELINE_STANDARD_HOURS);
});

test('ギルド時間軸は期限と延長見込の合計が7日を超えたときだけ拡張し、以後は縮小しない', () => {
  const expanded = getGuildTimeStatus({ tick: 0, contributionPoints: 240, extensionHours: 200 });
  const later = getGuildTimeStatus({
    tick: GAME_TICKS_PER_HOUR * 300,
    contributionPoints: 0,
    extensionHours: 200,
    timelineHours: expanded.timelineHours,
  });

  assert.equal(expanded.remainingHours, 368);
  assert.equal(expanded.estimatedExtensionHours, 24);
  assert.equal(expanded.timelineHours, 392);
  assert.equal(later.remainingHours, 68);
  assert.equal(later.timelineHours, expanded.timelineHours);
});

test('Itemの重量と価値はタグ表とタグ数により決まる', () => {
  const expectedValues = {
    valor: [3, 2], arcane: [2, 3], dexterity: [1, 2], reputation: [2, 3], blessing: [1, 3],
    iron: [5, 2], cloth: [1, 1], feather: [1, 2], gem: [5, 5], fortune: [1, 3],
    fire: [2, 2], water: [2, 2], lightning: [2, 3], area: [3, 3], vitality: [1, 3],
  };
  Object.entries(expectedValues).forEach(([tag, [weight, value]]) => {
    assert.deepEqual([TAGS[tag].weight, TAGS[tag].value], [weight, value]);
  });

  const factory = new ItemFactory();
  const taggedItem = factory.createWeapon({ weapon: 'sword', tags: ['valor', 'fire'], x: 0, y: 0 });
  const taglessItem = factory.createWeapon({ weapon: 'staff', tags: [], x: 0, y: 0 });
  assert.deepEqual([taggedItem.chip.weight, taggedItem.value], [5, 8]);
  assert.deepEqual([taglessItem.chip.weight, taglessItem.value], [1, 1]);
});
