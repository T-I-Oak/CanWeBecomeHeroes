import assert from 'node:assert/strict';
import test from 'node:test';
import ChipBoard from '../../src/chips/ChipBoard.js';
import BattleSystem from '../../src/game/BattleSystem.js';
import CombatActionGaugeSystem, { getActionGaugeMaximum } from '../../src/game/CombatActionGaugeSystem.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import ItemFactory from '../../src/game/ItemFactory.js';

test('stealing current gauge transfers the specified share of every source without using their maximum', () => {
  const system = new CombatActionGaugeSystem();
  const recipient = { chip: { actionGauge: 1 } };
  const first = { chip: { actionGauge: 5, actionGaugeMaximum: 20 } };
  const second = { chip: { actionGauge: 3, actionGaugeMaximum: 4 } };

  assert.equal(system.stealCurrentGauge(recipient, [first, second], 0.2), 1.6);
  assert.equal(recipient.chip.actionGauge, 2.6);
  assert.equal(first.chip.actionGauge, 4);
  assert.equal(second.chip.actionGauge, 2.4);
});

test('bows shorten the action gauge by ten percent per weapon up to five weapons', () => {
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'hunter', x: 100, y: 100, stamina: 3 });
  hero.equip(itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 }));
  hero.equip(itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 }));
  assert.equal(getActionGaugeMaximum(hero), (15 - hero.getStatus('speed')) * 0.8);

  const board = new ChipBoard({ width: 3000, height: 2000 });
  const battle = new BattleSystem(board, { controller: {}, itemFactory, logger: { info: () => {} } });
  battle.updateActionGaugeMaximum(hero);
  assert.equal(hero.chip.actionGaugeBaseMaximum, 15 - hero.getStatus('speed'));
  assert.equal(hero.chip.actionGaugeMaximum / hero.chip.actionGaugeBaseMaximum, 0.8);

  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
  enemy.equipment = Array.from({ length: 6 }, () => itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 }));
  enemy.refreshDerivedValues();
  assert.equal(getActionGaugeMaximum(enemy), (15 - enemy.getStatus('speed')) * 0.5);
});

test('stealing a bow immediately refreshes the affected action gauge maximum', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const itemFactory = new ItemFactory();
  const hero = new HeroFactory().create({ profession: 'thief', x: 100, y: 100, stamina: 3, maximums: { speed: 7 } });
  const enemy = new EnemyFactory({ itemFactory }).createInitialEncounter({ totalTagCount: 0 });
  const bow = itemFactory.createWeapon({ weapon: 'bow', tags: [], x: 0, y: 0 });
  enemy.equipment = [bow];
  enemy.refreshDerivedValues();
  const battle = new BattleSystem(board, { controller: { addToWarehouse: () => {} }, itemFactory, logger: { info: () => {} } });

  battle.transferStolenItem(hero, enemy, bow);

  assert.equal(enemy.chip.actionGaugeMaximum, 15 - enemy.getStatus('speed'));
});
