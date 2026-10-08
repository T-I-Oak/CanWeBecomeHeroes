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

test('magic standard damage uses half the physical standard divisor', () => {
  const actor = { getStatus: () => 1 };
  assert.equal(getAttackDamage(actor, { stat: 'power', multiplier: 1 }), 0.75);
  assert.equal(getAttackDamage(actor, { stat: 'magic', multiplier: 1 }), 0.375);
});

test('orb is a tiny physical attack and banner is a tiny magical attack', () => {
  assert.deepEqual(WEAPON_ATTACKS.orb, ['power', 1 / 3]);
  assert.deepEqual(WEAPON_ATTACKS.banner, ['magic', 1 / 3]);
});

test('weapon damage applies the approved standard, medium, small and tiny proportions', () => {
  const actor = { getStatus: () => 3 };
  const physical = getAttackDamage(actor, WEAPON_ATTACKS.sword);
  const magic = getAttackDamage(actor, WEAPON_ATTACKS.staff);
  assert.equal(physical, 1.75);
  assert.equal(magic, 0.875);
  assert.ok(Math.abs(getAttackDamage(actor, WEAPON_ATTACKS.bow) / physical - 2 / 3) < 1e-12);
  assert.equal(getAttackDamage(actor, WEAPON_ATTACKS['holy-book']) / magic, 1 / 2);
  for (const type of ['shield', 'claw', 'orb', 'unarmed']) assert.ok(Math.abs(getAttackDamage(actor, WEAPON_ATTACKS[type]) / physical - 1 / 3) < 1e-12);
  for (const type of ['banner', 'holy-symbol', 'tarot-cards']) assert.ok(Math.abs(getAttackDamage(actor, WEAPON_ATTACKS[type]) / magic - 1 / 3) < 1e-12);
});

test('battle random modifiers range from eighty through one hundred twenty percent', () => {
  assert.equal(getRandomModifier(() => 0), 0.8);
  assert.ok(Math.abs(getRandomModifier(() => 1) - 1.2) < 1e-9);
});
