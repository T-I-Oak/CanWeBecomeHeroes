import test from 'node:test';
import assert from 'node:assert/strict';
import RunController, { TRIAL_FINAL_STAGE_NUMBER } from '../../src/game/RunController.js';
import Camera from '../../src/game/Camera.js';
import { getSpeedFromLog, readTimeSettings, writeTimeSettings } from '../../src/game/GameSpeedSettings.js';
import { unlockClearedTrialMembers } from '../../src/game/TrialCompletionProgress.js';
import HeroProgressRepository from '../../src/game/HeroProgressRepository.js';
import CombatStageLifecycle, { BATTLE_VICTORY_DELAY_TICKS } from '../../src/game/CombatStageLifecycle.js';
import GuildSystem, { GUILD_APPLICATION_TICKS } from '../../src/game/GuildSystem.js';
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

test('試験課題は進行に応じてレベルが上がり、第7試験はボス課題になる', () => {
  const createController = () => {
    const board = new ChipBoard({ width: 3000, height: 2000 });
    return new StageController({
      enemySpawn: new EnemySpawnSystem({ add: () => {} }),
      battleSystem: new BattleSystem(board, { controller: {}, itemFactory: {} }),
      enemyFactory: new EnemyFactory(),
      random: () => 0.99,
    });
  };

  const firstChoices = createController().createStageChoices({ stageNumber: 1 });
  const finalChoices = createController().createStageChoices({ stageNumber: 7 });

  assert.ok(firstChoices.every((choice) => choice.kind === 'regular' && choice.level === 5));
  assert.ok(finalChoices.every((choice) => choice.kind === 'boss' && choice.level === 11));
});

test('課題の戦闘は敵の着地後に始まり、勝利表示の後に完了する', () => {
  const lifecycle = new CombatStageLifecycle();
  const enemy = { chip: { isSettled: false } };
  lifecycle.markEnemyEncountered([enemy]);

  assert.equal(lifecycle.startWhenReady([enemy], 10), false);
  enemy.chip.isSettled = true;
  assert.equal(lifecycle.startWhenReady([enemy], 20), true);
  assert.equal(lifecycle.markVictory(100), true);
  lifecycle.updateVictoryDelay(BATTLE_VICTORY_DELAY_TICKS - 1, 299);
  assert.equal(lifecycle.isComplete(), false);
  lifecycle.updateVictoryDelay(1, 300);
  assert.equal(lifecycle.isComplete(), true);
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

test('武器は装備順に対象候補を絞り、残った候補は近さと左位置で決める', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const battle = new BattleSystem(board, { controller: {}, itemFactory, logger: { info: () => {} } });
  const createEnemyAt = (x) => {
    const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
    enemy.chip.x = x;
    enemy.chip.y = 500;
    return enemy;
  };
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 500, y: 500, stamina: 3 });
  const left = createEnemyAt(400);
  const right = createEnemyAt(600);
  [hero, left, right].forEach((entity) => board.addChip(entity.chip));
  assert.equal(battle.findTarget(hero, [hero, left, right]), left);

  const archer = new HeroFactory().create({ profession: 'hunter', x: 1500, y: 500, stamina: 3 });
  archer.equip(itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 }));
  const nearer = createEnemyAt(1400);
  const farLeft = createEnemyAt(1200);
  const farRight = createEnemyAt(1800);
  [archer, nearer, farLeft, farRight].forEach((entity) => board.addChip(entity.chip));
  assert.equal(battle.findTarget(archer, [archer, nearer, farLeft, farRight]), farLeft);

  const target = ({ x, hp = 5, weight = 0, equipment = [] }) => ({
    chip: { type: 'enemy', x, y: 500 }, hp, equipment,
    getCarriedWeight: () => weight,
  });
  const weapon = (type) => ({ category: 'weapon', type });
  const actor = (type) => ({ chip: { type: 'hero', x: 1000, y: 500 }, equipment: { rightHand: weapon(type), leftHand: null } });
  const testTarget = (type, candidates, expected) => {
    const current = actor(type);
    [current, ...candidates].forEach((entity) => board.addChip(entity.chip));
    assert.equal(battle.findTarget(current, [current, ...candidates]), expected, type);
  };
  const highHp = target({ x: 900, hp: 8 });
  const lowHp = target({ x: 1100, hp: 2 });
  testTarget('sword', [highHp, lowHp], highHp);
  const distantHighHp = target({ x: 500, hp: 8 });
  const nearbyHighHp = target({ x: 950, hp: 8 });
  testTarget('sword', [distantHighHp, nearbyHighHp], nearbyHighHp);
  const swordThenBow = { chip: { type: 'hero', x: 1000, y: 500 }, equipment: { rightHand: weapon('sword'), leftHand: weapon('bow') } };
  [swordThenBow, distantHighHp, nearbyHighHp].forEach((entity) => board.addChip(entity.chip));
  assert.equal(battle.findTarget(swordThenBow, [swordThenBow, distantHighHp, nearbyHighHp]), distantHighHp);
  ['staff', 'holy-book', 'holy-symbol', 'banner', 'tarot-cards'].forEach((type) => testTarget(type, [highHp, lowHp], lowHp));
  const lavish = target({ x: 1100, equipment: [{ tags: ['valor', 'iron', 'fire'] }] });
  const plain = target({ x: 900, equipment: [{ tags: [] }] });
  testTarget('claw', [lavish, plain], lavish);
  const heavy = target({ x: 900, weight: 5 });
  const light = target({ x: 1100, weight: 1 });
  testTarget('orb', [heavy, light], light);
  const fartherShieldTarget = target({ x: 800 });
  const nearerShieldTarget = target({ x: 950 });
  testTarget('shield', [fartherShieldTarget, nearerShieldTarget], nearerShieldTarget);

  const enemyActor = { chip: { type: 'enemy', x: 1000, y: 500 }, equipment: [weapon('sword'), weapon('bow')] };
  const heroHigh = { chip: { type: 'hero', x: 900, y: 500 }, stamina: 8 };
  const heroLow = { chip: { type: 'hero', x: 1100, y: 500 }, stamina: 2 };
  [enemyActor, heroHigh, heroLow].forEach((entity) => board.addChip(entity.chip));
  assert.equal(battle.findTarget(enemyActor, [enemyActor, heroHigh, heroLow]), heroHigh);
});

test('敵を倒す戦闘行動は貢献ポイントと装備報酬を倉庫へ追加する', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ random: () => 0 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: enemy.chip.x, y: enemy.chip.y + 224, stamina: 3 });
  hero.equip(itemFactory.createWeapon({ weapon: 'sword', tags: [], x: 0, y: 0 }));
  hero.currentArea = 'battle';
  hero.chip.height = 0;
  enemy.chip.height = 0;
  [hero, enemy].forEach((entity) => board.addChip(entity.chip));
  const dropped = [];
  const battle = new BattleSystem(board, {
    controller: { remove() {}, addToWarehouse: (item) => dropped.push(item) },
    itemFactory,
    random: () => 0,
  });

  battle.update({ heroes: [hero], enemies: [enemy], tick: 0, tickDelta: 1000 });
  battle.update({ heroes: [hero], enemies: [enemy], tick: 1, tickDelta: 1000 });

  assert.equal(board.chips.includes(enemy.chip), false);
  assert.equal(battle.contributionPoints, 10);
  assert.equal(dropped.length, 5);
  assert.equal(dropped.reduce((total, item) => total + item.tags.length, 0), 5);
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
