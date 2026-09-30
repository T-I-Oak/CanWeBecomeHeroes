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
