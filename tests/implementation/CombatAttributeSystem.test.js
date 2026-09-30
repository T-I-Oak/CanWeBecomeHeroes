import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import CombatEffectSystem from '../../src/game/CombatEffectSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import { getEnemyDefinition } from '../../src/game/EnemyCatalog.js';
import { WEAPON_ATTACKS, getAttackDamage, getRandomModifier } from '../../src/game/CombatWeaponAttack.js';
import { getActionGaugeMaximum } from '../../src/game/CombatActionGaugeSystem.js';
import gameText from '../../src/game/readGameText.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import { expandLanguageResource } from '../../../GameWorksOAK/src/lib/core/i18n.js';

const textRepository = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();

test('attribute values are applied by maximum and decay every sixty ticks', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  hero.attributes.fire = 2;
  hero.attributes.water = 1;
  hero.attributes.lightning = 0.5;
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory() });

  battle.updateAttributes([hero], 60);

  assert.ok(Math.abs(hero.stamina - 2.8) < 1e-9);
  assert.ok(Math.abs(hero.attributes.fire - 1.8) < 1e-9);
  assert.ok(Math.abs(hero.attributes.water - 0.85) < 1e-9);
  assert.ok(Math.abs(hero.attributes.lightning - 0.375) < 1e-9);
  assert.equal(hero.chip.attributeValues, hero.attributes);
});

test('each attribute uses the attacker luck roll to determine its application rate', () => {
  const randomValues = [0.25, 0.5, 0, 0.5];
  const battle = new BattleSystem(new ChipBoard({ width: 3000, height: 2000 }), {
    controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} }, random: () => randomValues.shift(),
  });
  const actor = {
    attributes: { water: 0 },
    getLuckDegree: () => 0.5,
    getTagSkillLevel: () => 0,
    getTagCount: (tag) => ({ fire: 1, water: 1, lightning: 0 })[tag] ?? 0,
  };
  const target = {
    attributes: { fire: 0, water: 0, lightning: 0 },
    attributeSources: { fire: null, water: null, lightning: null },
    chip: {},
    getLuckDegree: () => 0.95,
    getTagSkillLevel: () => 4,
  };

  battle.applyAttributes(actor, target, 1);

  assert.equal(target.attributes.fire, 0.5);
  assert.equal(target.attributes.water, 1);
  assert.equal(target.attributeSources.fire, actor);
  assert.equal(target.attributeSources.water, actor);
});

test('lightning propagates only through contiguous opponent slots', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const enemyFactory = new EnemyFactory();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 500, y: 500, stamina: 10, maximums: { stamina: 10 } });
  hero.currentArea = 'battle';
  hero.currentSlotId = 'battle-2';
  const target = enemyFactory.createInitialEncounter({ slotPosition: 3, maximumHp: 10 });
  const adjacent = enemyFactory.createInitialEncounter({ slotPosition: 4, maximumHp: 10 });
  const separated = enemyFactory.createInitialEncounter({ slotPosition: 6, maximumHp: 10 });
  target.attributes.lightning = 3;
  [hero, target, adjacent, separated].forEach((entity) => board.addChip(entity.chip));
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.propagate(hero, target, 'sword', 1, [hero, target, adjacent, separated]);

  assert.equal(adjacent.hp, 9.4);
  assert.equal(separated.hp, 10);
});

test('a knocked-back combatant blocks lightning propagation at its vacant slot', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const enemyFactory = new EnemyFactory();
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 500, y: 500, stamina: 10, maximums: { stamina: 10 } });
  hero.currentArea = 'battle';
  hero.currentSlotId = 'battle-2';
  const source = enemyFactory.createInitialEncounter({ slotPosition: 3, maximumHp: 10 });
  const knockedBack = enemyFactory.createInitialEncounter({ slotPosition: 4, maximumHp: 10 });
  const beyondGap = enemyFactory.createInitialEncounter({ slotPosition: 5, maximumHp: 10 });
  source.attributes.lightning = 3;
  [hero, source, knockedBack, beyondGap].forEach((entity) => board.addChip(entity.chip));
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.knockbackSystem.begin(knockedBack, 100);
  battle.propagate(hero, source, 'sword', 1, [hero, source, knockedBack, beyondGap]);

  assert.equal(knockedBack.hp, 10);
  assert.equal(beyondGap.hp, 10);
});

test('a knocked-back hero continues to receive and decay attributes', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 500, y: 500, stamina: 3, maximums: { stamina: 3 } });
  hero.currentArea = 'battle';
  hero.currentSlotId = 'battle-2';
  hero.attributes.fire = 2;
  hero.attributes.water = 2;
  hero.attributes.lightning = 2;
  const enemy = new EnemyFactory().createInitialEncounter({ maximumHp: 10 });
  [hero, enemy].forEach((entity) => {
    entity.chip.height = 0;
    entity.chip.verticalVelocity = 0;
    board.addChip(entity.chip);
  });
  const battle = new BattleSystem(board, { controller: {}, itemFactory: new ItemFactory(), logger: { info: () => {} } });

  battle.knockbackSystem.begin(hero, 100);
  battle.update({ heroes: [hero], enemies: [enemy], tick: 1, tickDelta: 60 });

  assert.equal(hero.stamina, 2.8);
  assert.ok(Math.abs(hero.attributes.fire - 1.8) < 1e-9);
  assert.ok(Math.abs(hero.attributes.water - 1.8) < 1e-9);
  assert.ok(Math.abs(hero.attributes.lightning - 1.8) < 1e-9);
});
