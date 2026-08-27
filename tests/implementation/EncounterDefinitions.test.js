import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import { COMBINATION_PATTERNS, createEncounterEnemies, DIFFICULTIES } from '../../src/game/EncounterDefinitions.js';

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
  assert.deepEqual(first.roles.main.slotPositions, [3, 4]);
  assert.deepEqual(first.roles.support1.slotPositions, [2, 5]);
  assert.deepEqual(first.roles.support2.slotPositions, [1, 6]);
  assert.equal(first.roles.main.weaponCount, 2);
  assert.equal(first.roles.main.totalTagBudget, 3);
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
});
