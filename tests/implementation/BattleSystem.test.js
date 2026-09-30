import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem, { BATTLE_VICTORY_DELAY_TICKS } from '../../src/game/BattleSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import gameText from '../../src/game/readGameText.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import { expandLanguageResource } from '../../../GameWorksOAK/src/lib/core/i18n.js';

const textRepository = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();

test('a full action gauge resolves basic damage, awards contribution, and drops an item', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ random: () => 0 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: enemy.chip.x, y: enemy.chip.y + 224, stamina: 3 });
  hero.equip(itemFactory.createWeapon({ weapon: 'sword', tags: [], x: 0, y: 0 }));
  hero.currentArea = 'battle';
  hero.chip.height = 0;
  enemy.chip.height = 0;
  board.addChip(hero.chip);
  board.addChip(enemy.chip);
  const dropped = [];
  const removed = [];
  const controller = {
    remove: (entity) => removed.push(entity),
    addToWarehouse: (item) => dropped.push(item),
  };
  const battle = new BattleSystem(board, { controller, itemFactory, random: () => 0 });

  battle.update({ heroes: [hero], enemies: [enemy], tick: 0, tickDelta: 1000 });
  battle.update({ heroes: [hero], enemies: [enemy], tick: 1, tickDelta: 1000 });

  assert.equal(board.chips.includes(enemy.chip), false);
  assert.equal(battle.contributionPoints, 10);
  assert.deepEqual(removed, [enemy]);
  assert.equal(dropped.length, 5);
  assert.equal(dropped.reduce((total, item) => total + item.tags.length, 0), 5);
});

test('enemy wipe locks the stage victory before completing it after the victory delay', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: enemy.chip.x, y: enemy.chip.y + 224, stamina: 3 });
  hero.currentArea = 'battle';
  hero.chip.height = 0;
  enemy.chip.height = 0;
  board.addChip(hero.chip);
  board.addChip(enemy.chip);
  const records = [];
  const battle = new BattleSystem(board, { textRepository, controller: {}, itemFactory, logger: { info: () => {} }, gameLog: { log: (message, options) => records.push({ message, options }) } });

  battle.update({ heroes: [hero], enemies: [enemy], tick: 0, tickDelta: 1 });
  board.removeChip(enemy.chip);
  battle.update({ heroes: [hero], enemies: [enemy], tick: 1, tickDelta: 1 });

  assert.equal(battle.hasStageVictory(), true);
  assert.equal(battle.isStageComplete(), false);
  assert.equal(battle.defeatTick, 1);
  assert.deepEqual(records, [{ message: '敵を全滅させた。', options: { subject: 'system', level: 'info', channel: 'event' } }]);
  battle.update({ heroes: [hero], enemies: [enemy], tick: 1 + BATTLE_VICTORY_DELAY_TICKS, tickDelta: BATTLE_VICTORY_DELAY_TICKS });
  assert.equal(battle.isStageComplete(), true);
  assert.equal(battle.stageCompleteTick, 1 + BATTLE_VICTORY_DELAY_TICKS);
});

test('an actor with no opponent spends a full action gauge without performing an attack', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  hero.currentArea = 'battle';
  hero.chip.height = 0;
  board.addChip(hero.chip);
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.battleStartTick = 0;
  battle.update({ heroes: [hero], enemies: [], tick: 1, tickDelta: 1000 });

  assert.equal(hero.chip.actionGauge, 0);
  assert.equal(hero.stamina, 3);
});

test('leaving the battle area clears all temporary battle state', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  hero.currentArea = 'battle';
  hero.targetArea = 'preparation';
  hero.chip.actionGauge = 4;
  hero.chip.actionGaugeMaximum = 15;
  hero.chip.actionGaugeBaseMaximum = 15;
  hero.attributes = { fire: 3, water: 2, lightning: 1 };
  hero.attributeSources = { fire: hero, water: hero, lightning: hero };
  hero.physicalDamageReduction = 0.5;
  hero.chip.attributeValues = hero.attributes;
  hero.chip.physicalDamageReduction = hero.physicalDamageReduction;
  hero.luckBonus = 0.25;
  hero.chip.tilt = 0.2;
  hero.chip.poseTilt = 0.1;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.update({ heroes: [hero], enemies: [], tick: 1, tickDelta: 1 });

  assert.equal(hero.chip.actionGauge, null);
  assert.equal(hero.chip.actionGaugeMaximum, null);
  assert.equal(hero.chip.actionGaugeBaseMaximum, null);
  assert.deepEqual(hero.attributes, { fire: 0, water: 0, lightning: 0 });
  assert.deepEqual(hero.attributeSources, { fire: null, water: null, lightning: null });
  assert.equal(hero.physicalDamageReduction, 0);
  assert.equal(hero.chip.physicalDamageReduction, 0);
  assert.equal(hero.chip.tilt, 0);
  assert.equal(hero.chip.poseTilt, 0.1);
  assert.equal(hero.luckBonus, 0);
});

test('fire depletion during knockback starts the normal hero return and cancels knockback', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 500, y: 500, stamina: 1, maximums: { stamina: 3 } });
  hero.currentArea = 'battle';
  hero.currentSlotId = 'battle-2';
  hero.attributes.fire = 20;
  const enemy = new EnemyFactory().createInitialEncounter({ maximumHp: 10 });
  [hero, enemy].forEach((entity) => {
    entity.chip.height = 0;
    entity.chip.verticalVelocity = 0;
    board.addChip(entity.chip);
  });
  let returnedHero = null;
  const battle = new BattleSystem(board, {
    controller: {},
    itemFactory: new ItemFactory(),
    logger: { info: () => {} },
    returnSystem: { begin: (combatant) => { returnedHero = combatant; }, update: () => false },
  });

  battle.knockbackSystem.begin(hero, 100);
  battle.update({ heroes: [hero], enemies: [enemy], tick: 1, tickDelta: 60 });

  assert.equal(hero.stamina, 0);
  assert.equal(returnedHero, hero);
  assert.equal(battle.knockbackSystem.isKnockedBack(hero), false);
});

