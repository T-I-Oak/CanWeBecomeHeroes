import assert from 'node:assert/strict';
import test from 'node:test';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import CombatDamageReactionSystem from '../../src/game/CombatDamageReactionSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import UniqueSkillEffectSystem from '../../src/game/UniqueSkillEffectSystem.js';

function createReactionSystem(attributeSystem) {
  return new CombatDamageReactionSystem({
    controller: null,
    itemFactory: null,
    attributeSystem,
    getWarehouseDropPosition: () => ({ x: 0, y: 0 }),
    uniqueSkillEffectSystem: new UniqueSkillEffectSystem({
      uniqueSkillSystem: {
        getTriggeredSkills: () => [{
          id: 'fire-retaliation-ember', level: 1, levelDetail: { fireAttributeRate: 0.5 },
        }],
      },
    }),
  });
}

test('retaliation ember applies fire to the physical or magic attacker through the shared attribute system', () => {
  const applications = [];
  const owner = { getTagCount: () => 6 };
  const attacker = {};
  const reactions = createReactionSystem({ applyAttribute: (...args) => applications.push(args) });

  reactions.resolve({ actor: attacker, target: owner, category: 'physical', damage: 1 });
  reactions.resolve({ actor: attacker, target: owner, category: 'magic', damage: 1 });

  assert.deepEqual(applications, [
    [owner, attacker, 'fire', 3],
    [owner, attacker, 'fire', 3],
  ]);
});

test('retaliation ember ignores rounded-zero, attribute, and reflection damage', () => {
  const applications = [];
  const owner = { getTagCount: () => 6 };
  const reactions = createReactionSystem({ applyAttribute: (...args) => applications.push(args) });

  reactions.resolve({ actor: {}, target: owner, category: 'physical', damage: 0 });
  reactions.resolve({ actor: {}, target: owner, category: null, damage: 1 });
  reactions.resolve({ actor: {}, target: owner, category: 'reflection', damage: 1 });

  assert.deepEqual(applications, []);
});

test('thunder drain transfers a rate of every opposing participant current gauge to its owner', () => {
  const owner = { chip: { type: 'enemy', actionGauge: 1 } };
  const attacker = { chip: { type: 'hero', actionGauge: 5 } };
  const ally = { chip: { type: 'hero', actionGauge: 3 } };
  const calls = [];
  const reactions = new CombatDamageReactionSystem({
    controller: null,
    itemFactory: null,
    getWarehouseDropPosition: () => ({ x: 0, y: 0 }),
    actionGaugeSystem: { stealCurrentGauge: (...args) => calls.push(args) },
    uniqueSkillEffectSystem: {
      resolve: () => [{ actionGaugeAbsorption: { currentGaugeStealRate: 0.2 } }],
    },
  });

  reactions.resolve({ actor: attacker, target: owner, participants: [owner, attacker, ally] });

  assert.deepEqual(calls, [[owner, [attacker, ally], 0.2]]);
});

test('gem orb-rain drops its level-specific orb rewards for each successful damage trigger', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createFromDefinition({ enemyDefinitionId: 'large-gem', slotPosition: 3, maximumHp: 10, totalTagCount: 0, random: () => 0 });
  const drops = [];
  const battle = new BattleSystem(board, { controller: { addToWarehouse: (item) => drops.push(item) }, itemFactory, random: () => 0, logger: { info: () => {} } });

  battle.applyDamage(null, enemy, 'fire', 1);

  assert.equal(drops.length, 2);
  assert.deepEqual(drops.map((item) => item.type), ['orb', 'orb']);
  assert.deepEqual(drops.map((item) => item.tags), [['gem', 'gem'], ['gem', 'gem']]);
});

test('retaliation ember applies the mid-boss fire value to an attacker after physical damage', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createFromDefinition({ enemyDefinitionId: 'medium-fire', slotPosition: 3, maximumHp: 10, totalTagCount: 0, random: () => 0 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: enemy.chip.x, y: enemy.chip.y + 224, stamina: 10, maximums: { stamina: 10 } });
  const battle = new BattleSystem(board, { controller: {}, itemFactory, random: () => 0 });

  battle.applyPhysicalDamage(hero, enemy, 'sword', 1, false, [hero, enemy]);

  assert.equal(hero.attributes.fire, 0.5);
  assert.equal(hero.attributeSources.fire, enemy);
});

test('thunder drain uses the active opposing participants current gauges after a lightning-infused physical attack', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const enemy = new EnemyFactory({ itemFactory }).createFromDefinition({
    enemyDefinitionId: 'medium-lightning', slotPosition: 3, maximumHp: 3, totalTagCount: 0, weaponCount: 0,
  });
  const attacker = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const ally = new HeroFactory().create({ profession: 'guard', x: 200, y: 100, stamina: 3 });
  attacker.attributes.lightning = 1;
  enemy.chip.actionGauge = 1;
  attacker.chip.actionGauge = 5;
  ally.chip.actionGauge = 3;
  const battle = new BattleSystem(board, { controller: {}, itemFactory, random: () => 0 });

  battle.applyPhysicalDamage(attacker, enemy, 'sword', 1, false, [enemy, attacker, ally]);

  assert.equal(enemy.chip.actionGauge, 1.8);
  assert.equal(attacker.chip.actionGauge, 4.5);
  assert.equal(ally.chip.actionGauge, 2.7);
});
