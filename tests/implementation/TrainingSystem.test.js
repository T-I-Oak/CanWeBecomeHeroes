import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import TrainingSystem, { TRAINING_INTERVAL_TICKS, TRAINING_RESULT_DISPLAY_TICKS } from '../../src/game/TrainingSystem.js';

function trainingHero({ stamina = 3, maximums = {} } = {}) {
  const hero = new HeroFactory().create({ profession: 'mage', x: 300, y: 300, stamina, maximums, bounds: { x: 0, y: 0, width: 600, height: 400 } });
  hero.currentArea = 'training';
  return hero;
}

test('training raises a weighted eligible maximum after 200 ticks and consumes successful stamina', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = trainingHero();
  board.addChip(hero.chip);
  const messages = [];
  const training = new TrainingSystem(board, new HeroSlotManager(), { random: () => 0, gameLog: { log: (message, options) => messages.push({ message, options }) } });

  training.update([hero], TRAINING_INTERVAL_TICKS / 60);

  assert.equal(hero.maximums.magic, 4);
  assert.equal(hero.stamina, 2);
  assert.deepEqual(training.getPresentation(hero).gainedCells, [{ stat: 'magic', value: 4 }]);
  assert.deepEqual(messages, [{ message: '魔法使い・ケイシーは魔力を強化した。', options: { subject: 'hero', level: 'luck', channel: 'training' } }]);
});

test('training records a hero log after a non-lucky result', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = trainingHero();
  board.addChip(hero.chip);
  const messages = [];
  const training = new TrainingSystem(board, new HeroSlotManager(), { random: () => 0.99, gameLog: { log: (message, options) => messages.push({ message, options }) } });

  training.update([hero], TRAINING_INTERVAL_TICKS / 60);

  assert.equal(hero.stamina, 1);
  assert.deepEqual(messages, [{ message: '魔法使い・ケイシーはスタミナを強化した。', options: { subject: 'hero', level: 'info', channel: 'training' } }]);
});

test('training returns a hero with insufficient stamina and restores only destination equipment', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = trainingHero({ stamina: 1 });
  const destination = new ItemFactory().createDestination({ destination: 'hero-license', x: 800, y: 800 });
  const weapon = new ItemFactory().createWeapon({ weapon: 'staff', tags: [], x: 900, y: 800 });
  hero.equip(destination);
  hero.equip(weapon);
  board.addChip(hero.chip);
  const returned = [];
  const training = new TrainingSystem(board, new HeroSlotManager(), { random: () => 0.99, onItemReturned: (item) => returned.push(item) });

  training.update([hero], TRAINING_INTERVAL_TICKS / 60);

  assert.equal(hero.stamina, 0);
  assert.equal(returned.length, 0);
  training.update([hero], TRAINING_RESULT_DISPLAY_TICKS / 60);
  assert.deepEqual(returned, [destination]);
  assert.deepEqual(Object.values(hero.equipment), [null, null, null, null, null]);
});

test('training returns when every non-maximum status has zero weight', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const hero = trainingHero({ maximums: { power: 7, magic: 7, speed: 7, negotiation: 7, luck: 7, stamina: 7 } });
  board.addChip(hero.chip);
  const training = new TrainingSystem(board, new HeroSlotManager());

  training.update([hero], TRAINING_INTERVAL_TICKS / 60);

  assert.equal(training.states.get(hero).returnAfterResult, true);
  training.update([hero], TRAINING_RESULT_DISPLAY_TICKS / 60);
  assert.equal(training.states.get(hero).returning, true);
});
