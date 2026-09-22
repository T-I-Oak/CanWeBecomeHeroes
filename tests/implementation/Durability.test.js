import test from 'node:test';
import assert from 'node:assert/strict';
import HeroFactory from '../../src/game/HeroFactory.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import { DURABILITY_UNIT_SCALE } from '../../src/game/Durability.js';

test('heroes and enemies store durability in hundredth units while exposing display values', () => {
  const hero = new HeroFactory().create({ profession: 'swordfighter', x: 0, y: 0, stamina: 2.994 });
  const enemy = new EnemyFactory().createInitialEncounter({ maximumHp: 2.994 });

  assert.equal(hero.staminaUnits, 299);
  assert.equal(hero.stamina, 2.99);
  assert.equal(enemy.hpUnits, 299);
  assert.equal(enemy.hp, 2.99);
  assert.equal(DURABILITY_UNIT_SCALE, 100);
});
