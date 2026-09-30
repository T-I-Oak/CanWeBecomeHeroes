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

test('one action aggregates miss and damage feedback by target with critical priority', () => {
  const effects = new CombatEffectSystem();
  const target = { chip: {} };

  effects.beginAction();
  effects.miss(target);
  effects.damage(target, 0.1);
  effects.damage(target, 0.2, true);
  effects.endAction();

  assert.equal(effects.popups.length, 1);
  assert.equal(effects.popups[0].key, 'combatCritical');
  assert.deepEqual(effects.popups[0].values, { amount: 30 });
  assert.equal(effects.hits.length, 1);
});

test('orb animates a gem tag from its owner when the tag is successfully added', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const effects = new CombatEffectSystem();
  const item = new ItemFactory().createWeapon({ weapon: 'sword', tags: ['valor'], x: 0, y: 0 });
  const actor = { chip: { x: 10, y: 10, height: 0 }, getLuckDegree: () => 1 };
  const target = { chip: { type: 'enemy', x: 20, y: 20, height: 0 }, equipment: [item], refreshDerivedValues: () => {} };
  const battle = new BattleSystem(board, { effects, random: () => 0 });

  battle.applyOrb(actor, target, 1);

  assert.equal(item.tags.includes('gem'), true);
  assert.equal(effects.tagTransfers.length, 1);
  assert.equal(effects.tagTransfers[0].tag, 'gem');
  assert.equal(effects.tagTransfers[0].from, actor.chip);
  assert.equal(effects.tagTransfers[0].to, target.chip);
});
