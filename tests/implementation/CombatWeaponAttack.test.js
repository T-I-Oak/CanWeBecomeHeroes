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
  assert.deepEqual(WEAPON_ATTACKS.orb, ['power', 1 / 8]);
  assert.deepEqual(WEAPON_ATTACKS.banner, ['magic', 1 / 8]);
});

test('battle random modifiers range from eighty through one hundred twenty percent', () => {
  assert.equal(getRandomModifier(() => 0), 0.8);
  assert.ok(Math.abs(getRandomModifier(() => 1) - 1.2) < 1e-9);
});
