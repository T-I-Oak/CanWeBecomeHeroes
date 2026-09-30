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

test('one action records one visible battle log per actor and target', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const enemy = new EnemyFactory().createInitialEncounter();
  const records = [];
  const battle = new BattleSystem(board, { textRepository, gameLog: { log: (message, options) => records.push({ message, options }) } });

  battle.actionLog.begin();
  battle.recordMiss(hero, enemy);
  battle.recordDamage(hero, enemy, 0.1, false);
  battle.recordDamage(hero, enemy, 0.2, true);
  battle.actionLog.flush();

  assert.deepEqual(records, [{
    message: '【剣士・アヴェリー】は【ゴブリン】に会心ダメージ30を与えた。',
    options: { subject: 'hero', level: 'luck', channel: 'battle' },
  }]);
});

test('a missed action records a visible unlucky battle log', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const enemy = new EnemyFactory().createInitialEncounter();
  const records = [];
  const battle = new BattleSystem(board, { textRepository, gameLog: { log: (message, options) => records.push({ message, options }) } });

  battle.actionLog.begin();
  battle.recordMiss(hero, enemy);
  battle.actionLog.flush();

  assert.deepEqual(records, [{
    message: '【剣士・アヴェリー】の【ゴブリン】への攻撃は外れた。',
    options: { subject: 'hero', level: 'unluck', channel: 'battle' },
  }]);
});

test('a defeat replaces the action damage log with a visible defeat log', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const enemy = new EnemyFactory().createInitialEncounter();
  const records = [];
  const battle = new BattleSystem(board, { textRepository, gameLog: { log: (message, options) => records.push({ message, options }) } });

  battle.actionLog.begin();
  battle.recordDamage(hero, enemy, 2, false);
  battle.recordDefeat(hero, enemy);
  battle.actionLog.flush();

  assert.deepEqual(records, [{
    message: '【剣士・アヴェリー】は【ゴブリン】を倒した。',
    options: { subject: 'hero', level: 'info', channel: 'battle' },
  }]);
});
