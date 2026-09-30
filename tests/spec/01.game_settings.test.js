import test from 'node:test';
import assert from 'node:assert/strict';
import RunController, { TRIAL_FINAL_STAGE_NUMBER } from '../../src/game/RunController.js';
import Camera from '../../src/game/Camera.js';
import { getSpeedFromLog, readTimeSettings, writeTimeSettings } from '../../src/game/GameSpeedSettings.js';
import { unlockClearedTrialMembers } from '../../src/game/TrialCompletionProgress.js';
import HeroProgressRepository from '../../src/game/HeroProgressRepository.js';
import CombatStageLifecycle, { BATTLE_VICTORY_DELAY_TICKS } from '../../src/game/CombatStageLifecycle.js';
import GuildSystem, { GUILD_APPLICATION_TICKS } from '../../src/game/GuildSystem.js';
import {
  getOverheadStatusValue,
  getRotatingOverheadStatus,
  isOverheadStatusVisible,
  OVERHEAD_STATUS_VISIBILITY,
  writeOverheadStatusSettings,
} from '../../src/game/OverheadStatusSettings.js';
import StartPartySelection from '../../src/game/StartPartySelection.js';
import { createRunScenario } from '../../src/game/RunScenario.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import ChipBoard from '../../src/chips/ChipBoard.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import EnemySpawnSystem from '../../src/game/EnemySpawnSystem.js';
import ShopState from '../../src/game/ShopState.js';
import StageController from '../../src/game/StageController.js';
import EntityRegistry from '../../src/game/EntityRegistry.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
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
    heroProgress: { unlockMany: (professions) => unlocked.push(...professions), recordTrialClear() {} },
  }), true);
  assert.deepEqual(unlocked, ['swordfighter', 'mage', 'guard']);
});

test('ゲームラン中に加入したHeroは、試験クリアーまで解放済みにならない', () => {
  const unlockCalls = [];
  const heroProgress = { unlockMany: (professionIds) => unlockCalls.push(professionIds), recordTrialClear() {} };
  const members = [{ profession: 'swordfighter' }, { profession: 'mage' }];

  assert.equal(unlockClearedTrialMembers({ wasRunActive: true, runController: { state: 'active' }, members, heroProgress }), false);
  assert.deepEqual(unlockCalls, []);
});

test('クリアー済みのゲームランは、その時点のメンバーを一度だけ解放する', () => {
  const unlockCalls = [];
  const heroProgress = { unlockMany: (professionIds) => unlockCalls.push(professionIds), recordTrialClear() {} };
  const members = [{ profession: 'swordfighter' }, { profession: 'mage' }];
  const clearedRun = { state: 'cleared' };

  assert.equal(unlockClearedTrialMembers({ wasRunActive: true, runController: clearedRun, members, heroProgress }), true);
  assert.equal(unlockClearedTrialMembers({ wasRunActive: false, runController: clearedRun, members, heroProgress }), false);
  assert.deepEqual(unlockCalls, [['swordfighter', 'mage']]);
});

test('試験合格で解放したHeroは次回のパーティー選択に引き継がれる', () => {
  const values = new Map();
  const heroProgress = new HeroProgressRepository({ getValue: (key) => values.get(key), setValue: (key, value) => values.set(key, value) });
  const run = { state: 'cleared' };

  assert.equal(unlockClearedTrialMembers({
    wasRunActive: true,
    runController: run,
    members: [{ profession: 'swordfighter' }, { profession: 'mage' }, { profession: 'guard' }],
    heroProgress,
  }), true);

  assert.deepEqual(new StartPartySelection({ unlockedProfessionIds: heroProgress.getUnlockedProfessionIds() }).professionIds, ['swordfighter', 'guard']);
  assert.deepEqual(heroProgress.getUnlockedProfessionIds(), ['swordfighter', 'guard', 'mage']);
  assert.equal(heroProgress.hasClearedTrial(), true);
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

test('パーティー選択は新たに選んだHeroを第1にし、第1を再選択しても順序を変えない', () => {
  const selection = new StartPartySelection({ unlockedProfessionIds: ['swordfighter', 'guard', 'mage'] });

  selection.selectRosterHero('guard');
  assert.deepEqual(selection.professionIds, ['guard', 'swordfighter']);
  selection.selectRosterHero('mage');
  assert.deepEqual(selection.professionIds, ['mage', 'guard']);
  selection.selectRosterHero('mage');
  assert.deepEqual(selection.professionIds, ['mage', 'guard']);
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

test('ギルド利用は貢献ポイントで試験期限を延長してHeroを準備エリアへ帰還させる', () => {
  let contributionPoints = 100;
  const returned = [];
  const hero = new HeroFactory().create({ profession: 'mage', x: 300, y: 300, stamina: 5 });
  hero.currentArea = 'guild';
  hero.tags = ['reputation', 'reputation'];
  const guild = new GuildSystem({ begin: (member) => returned.push(member), update: () => false }, {
    getContributionPoints: () => contributionPoints,
    setContributionPoints: (value) => { contributionPoints = value; },
    random: () => 0,
  });

  guild.update([hero], GUILD_APPLICATION_TICKS / 60);

  assert.equal(guild.getExtensionHours(), 24);
  assert.equal(contributionPoints, 16);
  assert.deepEqual(returned, [hero]);
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

test('ズーム操作はポインタ位置にある盤面を見失わない', () => {
  const camera = new Camera({ width: 2400, height: 1800 });
  const pointer = { x: 240, y: 180 };
  camera.setViewport(800, 600);
  camera.setZoom(0.75, 400, 300);
  const worldPoint = camera.toWorld(pointer.x, pointer.y);

  camera.setZoomAtScreenPoint(1.1, pointer.x, pointer.y);

  assert.deepEqual(camera.toWorld(pointer.x, pointer.y), worldPoint);
});

test('通常速度は1.0倍で、選んだ進行速度は次回も引き継ぐ', () => {
  const values = new Map();
  const dataManager = { getValue: (key) => values.get(key), setValue: (key, value) => values.set(key, value) };

  assert.equal(getSpeedFromLog(readTimeSettings(dataManager).speedLog), 1);
  writeTimeSettings({ speedLog: 1 }, dataManager);

  assert.equal(getSpeedFromLog(readTimeSettings(dataManager).speedLog), 2);
});

test('頭上表示は選択項目を切り替え、耐久値だけを100倍の整数で示す', () => {
  const values = new Map();
  const dataManager = { getValue: (key) => values.get(key), setValue: (key, value) => values.set(key, value) };
  const settings = writeOverheadStatusSettings({ statuses: ['power', 'durability'], visibility: 'battle' }, dataManager);
  const hero = { chip: { type: 'hero' }, stamina: 2.5, currentArea: 'preparation', getStatus: () => 1.9 };
  const enemy = { chip: { type: 'enemy' }, hp: 4.5, currentArea: 'battle', getStatus: () => 2.9 };

  assert.equal(getRotatingOverheadStatus(settings.statuses, 0), 'power');
  assert.equal(getRotatingOverheadStatus(settings.statuses, 1), 'durability');
  assert.equal(isOverheadStatusVisible(hero, settings.visibility), false);
  assert.equal(isOverheadStatusVisible(enemy, settings.visibility), true);
  assert.equal(getOverheadStatusValue(hero, 'power'), 1);
  assert.equal(getOverheadStatusValue(hero, 'durability'), 250);
  assert.equal(getOverheadStatusValue(enemy, 'durability'), 450);
  assert.equal(settings.visibility, OVERHEAD_STATUS_VISIBILITY.battle);
});
