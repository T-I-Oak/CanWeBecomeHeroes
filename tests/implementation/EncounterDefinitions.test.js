import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import { COMBINATION_PATTERNS, createEncounterEnemies, DIFFICULTIES, normalizeEnemyMaximum } from '../../src/game/EncounterDefinitions.js';

test('regular encounter definitions provide complete concrete patterns for the available enemy types', () => {
  assert.equal(COMBINATION_PATTERNS.regular.length, 15);
  COMBINATION_PATTERNS.regular.forEach((pattern) => {
    assert.ok(pattern.main);
    assert.ok(pattern.support1);
    assert.ok(pattern.support2);
  });
});

test('regular difficulty derives enemy count and each enemy tag budget from its level', () => {
  const first = DIFFICULTIES.regular(1);
  const later = DIFFICULTIES.regular(99);
  assert.equal(first.roles.main.weaponCount, 2);
  assert.equal(first.roles.main.totalTagBudget, 3);
  assert.equal(DIFFICULTIES.regular(3).roles.main.contributionMultiplier, 1);
  assert.equal(DIFFICULTIES.regular(9).roles.main.contributionMultiplier, 1.5);
  assert.equal(first.roles.main.maximumHp, 1 / 3);
  assert.deepEqual(first.roles.main.maximums, { power: 1 / 3, magic: 1 / 3, speed: 1 / 3, negotiation: 1 / 3, luck: 1 / 3 });
  assert.equal(later.roles.main.totalTagBudget, 101);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((level) => {
    const { roles } = DIFFICULTIES.regular(level);
    return roles.main.count + roles.support1.count + roles.support2.count;
  }), [1, 2, 2, 3, 4, 4, 5, 6]);

  const board = new ChipBoard({ width: 3000, height: 2000 });
  const enemies = createEncounterEnemies({
    kind: 'regular', level: 1, pattern: COMBINATION_PATTERNS.regular[1], enemyFactory: new EnemyFactory(), random: () => 0,
  });
  enemies.forEach((enemy) => board.addChip(enemy.chip));

  assert.equal(enemies.length, 1);
  assert.ok(enemies.every((enemy) => enemy.definition.id === 'small-iron'));
  assert.deepEqual(enemies.map((enemy) => enemy.slotPosition), [3]);
  assert.ok(enemies.every((enemy) => enemy.equipment.length === 5));
  assert.ok(enemies.every((enemy) => enemy.equipment.filter((item) => item.category === 'weapon').length === 2));
  assert.ok(enemies.every((enemy) => enemy.equipment.flatMap((item) => item.tags).length === 3));
  assert.ok(enemies.every((enemy) => enemy.maximumHp === 1));
  assert.ok(enemies.every((enemy) => enemy.maximums.power === 1));
  assert.ok(enemies.every((enemy) => enemy.contributionPoints === 9));
  assert.equal(normalizeEnemyMaximum(19 / 3), 7);
});

test('elite roles add main and support enemies at their separate level intervals', () => {
  assert.deepEqual(Object.values(DIFFICULTIES.elite(6).roles).map(({ count }) => count), [1, 1, 1]);
  assert.deepEqual(Object.values(DIFFICULTIES.elite(8).roles).map(({ count }) => count), [2, 1, 1]);
  assert.deepEqual(Object.values(DIFFICULTIES.elite(15).roles).map(({ count }) => count), [3, 2, 1]);
  assert.deepEqual(Object.values(DIFFICULTIES.elite(22).roles).map(({ count }) => count), [4, 2, 2]);
});

test('slot allocation keeps main roles first and reserves two slots for each large boss', () => {
  const enemies = createEncounterEnemies({
    kind: 'boss', level: 9, pattern: COMBINATION_PATTERNS.boss[0], enemyFactory: new EnemyFactory(), random: () => 0,
  });
  assert.deepEqual(enemies.map(({ definition, slotPosition }) => [definition.size, slotPosition]), [
    ['large', 3], ['small', 2], ['small', 5], ['small', 1], ['small', 6],
  ]);
});

test('slot allocation fills from the center across roles without role-specific slot preferences', () => {
  const enemies = createEncounterEnemies({
    kind: 'elite', level: 6, pattern: COMBINATION_PATTERNS.elite[0], enemyFactory: new EnemyFactory(), random: () => 0,
  });
  assert.deepEqual(enemies.map(({ definition, slotPosition }) => [definition.size, slotPosition]), [
    ['medium', 3], ['small', 4], ['small', 2],
  ]);
});
