import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroFactory from '../../src/game/HeroFactory.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import FacilityReturnSystem from '../../src/game/FacilityReturnSystem.js';

test('facility return does not consume additional stamina', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const returns = new FacilityReturnSystem(board, new HeroSlotManager());
  const hero = new HeroFactory().create({
    profession: 'mage', x: 300, y: 300, stamina: 5, bounds: { x: 0, y: 0, width: 600, height: 400 },
  });

  returns.begin(hero);
  assert.equal(hero.stamina, 5);

  hero.stamina = 2;
  returns.begin(hero);
  assert.equal(hero.stamina, 2);
});
