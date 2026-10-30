import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../../src/chips/ChipBoard.js';
import BattleSystem from '../../../src/game/BattleSystem.js';
import CombatEffectSystem from '../../../src/game/CombatEffectSystem.js';
import EnemyFactory from '../../../src/game/EnemyFactory.js';
import HeroFactory from '../../../src/game/HeroFactory.js';
import ItemFactory from '../../../src/game/ItemFactory.js';
import { getEnemyDefinition } from '../../../src/game/EnemyCatalog.js';
import { WEAPON_ATTACKS, getAttackDamage, getRandomModifier } from '../../../src/game/CombatWeaponAttack.js';
import { getActionGaugeMaximum } from '../../../src/game/CombatActionGaugeSystem.js';
import gameText from '../../../src/game/readGameText.js';
import GameTextRepository, { textPart } from '../../../src/game/GameTextRepository.js';
import { expandLanguageResource } from '../../../../GameWorksOAK/src/lib/core/i18n.js';
import CombatActionLog from '../../../src/game/CombatActionLog.js';
import GameLog from '../../../src/game/GameLog.js';

const textRepository = await new GameTextRepository({ loadResource: async (path) => textPart(expandLanguageResource(gameText), path) }).load();

test('hero and enemy damage/miss remain in history while only critical and defeat notify', () => {
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 100, y: 100, stamina: 3 });
  const enemy = new EnemyFactory().createInitialEncounter();
  const gameLog = new GameLog({ textRepository });
  const action = new CombatActionLog({ gameLog, textRepository });
  for (const actor of [hero, enemy]) for (const kind of ['damage', 'miss', 'critical', 'defeat']) {
    const target = actor === hero ? enemy : hero;
    action.begin();
    if (kind === 'miss') action.recordMiss(actor, target);
    else {
      action.recordDamage(actor, target, .1, kind === 'critical');
      if (kind === 'defeat') action.recordDefeat(actor, target);
    }
    action.flush();
  }
  assert.deepEqual(gameLog.getRecords().map(({ subject, localized, notify }) => [subject, localized.key, notify]), [
    ['hero', 'logDamage', false], ['hero', 'logMiss', false], ['hero', 'logCritical', true], ['hero', 'logDefeat', true],
    ['enemy', 'logDamage', false], ['enemy', 'logMiss', false], ['enemy', 'logCritical', true], ['enemy', 'logDefeat', true],
  ]);
});

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
    options: { subject: 'hero', level: 'luck', channel: 'battle', notify: true },
  }]);
});

test('a missed action records an unlucky history log without a float notification', () => {
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
    options: { subject: 'hero', level: 'unluck', channel: 'battle', notify: false },
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

