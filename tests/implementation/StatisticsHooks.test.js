import test from 'node:test';
import assert from 'node:assert/strict';
import GameStatistics from '../../src/game/GameStatistics.js';
import StatisticsCollector from '../../src/game/StatisticsCollector.js';
import Achievements from '../../src/game/Achievements.js';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import ItemPickupController from '../../src/game/ItemPickupController.js';
import StageController from '../../src/game/StageController.js';
import GuildSystem from '../../src/game/GuildSystem.js';
import TrainingSystem from '../../src/game/TrainingSystem.js';
import ShopSystem from '../../src/game/ShopSystem.js';
import ShopState from '../../src/game/ShopState.js';

function setup() {
  const run = new GameStatistics({ run: true });
  const total = new GameStatistics();
  const collector = new StatisticsCollector({ run, total, achievements: new Achievements() });
  return { run, total, onStatistics: event => collector.record(event) };
}

test('real damage and defeat hook attribute direct and fire kills once, including zero-point kills', () => {
  const { run, onStatistics } = setup();
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0 });
  const battle = new BattleSystem(board, { controller: { remove() {}, addToWarehouse() {} }, itemFactory, onStatistics: event => onStatistics({ ...event, level: 9 }), random: () => 0.5 });
  const factory = new EnemyFactory();
  for (const [actor, type, points] of [[hero, 'sword', 10], [hero, 'fire', 0], [null, 'fire', 10]]) {
    const enemy = factory.create({ size: 'small', tagAffinity: 'valor', slotPosition: 3, maximumHp: 1, totalTagCount: 0, contributionPoints: points });
    board.addChip(enemy.chip);
    battle.applyDamage(actor, enemy, type, 2);
    battle.defeatEnemy(enemy, actor);
  }
  assert.equal(run.data.combat.defeats, 3);
  assert.equal(run.data.combat.points, 20);
  assert.deepEqual(run.data.heroes.Avery.defeats['small-valor'], { count: 2, highestLevel: 9 });
});

test('weapon and facility counts occur on successful departure, not equip or arrival; tags capture equip peaks', () => {
  const { run, onStatistics } = setup();
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const slots = new HeroSlotManager();
  const pickup = new ItemPickupController(board, slots, null, null, { onStatistics });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0 });
  hero.onStatistics = onStatistics;
  hero.equip(new ItemFactory().createWeapon({ weapon: 'claw', tags: ['fortune', 'fortune'], x: 0, y: 0 }));
  assert.deepEqual(run.data.heroes.Avery.weapons, {});
  pickup.moveToDestinationSlot({ hero });
  assert.equal(run.data.heroes.Avery.weapons.claw, 1);
  assert.equal(run.data.facilities.battle, 1);
  hero.clearEquipment();
  assert.equal(run.data.heroes.Avery.tags.fortune, 2);
});

test('stage clear is counted once at victory including the final stage, before completion delay', () => {
  const { run, onStatistics } = setup();
  let victory = false;
  let complete = false;
  const stages = new StageController({ enemySpawn: { schedule() {} }, battleSystem: { resetStageState() {}, hasStageVictory: () => victory, isStageComplete: () => complete, battleStartTick: 0 }, random: () => 0, onStatistics });
  stages.startStage({ stageNumber: 7 });
  victory = true;
  stages.update(); stages.update();
  complete = true;
  stages.update();
  const key = `${stages.currentStage.kind}:${stages.currentStage.patternIndex}`;
  assert.equal(run.data.stages[key].clears, 1);
  assert.equal(run.data.stages[key].highestLevel, stages.currentStage.level);
});

test('facility hooks report delivered gem tags, awarded hours, and only successful lucky training', () => {
  const { run, onStatistics } = setup();
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'merchant', x: 0, y: 0, stamina: 3 });
  const returns = { begin() {} };
  const guild = new GuildSystem(returns, { getContributionPoints: () => 10, setContributionPoints() {}, random: () => 0, onStatistics });
  guild.completeApplication(hero, {});
  assert.equal(run.data.heroes.Garnet.guildHours, guild.extensionHours);
  const training = new TrainingSystem(board, new HeroSlotManager(), { returnSystem: returns, random: () => 0, onStatistics });
  training.train(hero, { gainedCells: [] });
  assert.equal(run.data.heroes.Garnet.trainingLuck, 1);
  const shop = new ShopSystem(board, new ShopState({ saleTag: 'gem', nextTag: 'valor' }), returns, { onStatistics });
  const purchases = Array.from({ length: 10 }, (_, index) => ({ item: { tags: index === 0 ? ['gem', 'water'] : ['gem'], type: 'shield' }, enhanced: index < 2, baseCount: index === 0 ? 1 : 2 }));
  const state = { purchases, deliveredSets: 0 };
  shop.deliverSet(hero, state);
  assert.equal(run.data.heroes.Garnet.shopTags, 1, 'only an actual added tag counts, rather than an enhancement that exceeds available weapon tags');
});
