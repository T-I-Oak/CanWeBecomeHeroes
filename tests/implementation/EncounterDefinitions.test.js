import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import EnemyFactory from '../../src/game/EnemyFactory.js';
import { COMBINATION_PATTERNS, createEncounterEnemies, DIFFICULTIES } from '../../src/game/EncounterDefinitions.js';

test('normal encounter definitions provide complete concrete patterns for the available enemy types', () => {
  assert.equal(COMBINATION_PATTERNS.normal.length, 3);
  COMBINATION_PATTERNS.normal.forEach((pattern) => {
    assert.ok(pattern.main);
    assert.ok(pattern.support1);
    assert.ok(pattern.support2);
  });
});

test('normal difficulty derives each enemy tag budget from its level', () => {
  const first = DIFFICULTIES.normal(1);
  const later = DIFFICULTIES.normal(99);
  assert.deepEqual(first.roles.main.slotPositions, [3, 4]);
  assert.deepEqual(first.roles.support1.slotPositions, [2, 5]);
  assert.deepEqual(first.roles.support2.slotPositions, [1, 6]);
  assert.equal(first.roles.main.weaponCount, 2);
  assert.equal(first.roles.main.totalTagBudget, 4);
  assert.equal(later.roles.main.totalTagBudget, 102);

  const board = new ChipBoard({ width: 3000, height: 2000 });
  const enemies = createEncounterEnemies({
    kind: 'normal', level: 1, pattern: COMBINATION_PATTERNS.normal[1], enemyFactory: new EnemyFactory(), random: () => 0,
  });
  enemies.forEach((enemy) => board.addChip(enemy.chip));

  assert.equal(enemies.length, 2);
  assert.ok(enemies.every((enemy) => enemy.definition.id === 'small-iron'));
  assert.deepEqual(enemies.map((enemy) => enemy.slotPosition), [3, 4]);
  assert.ok(enemies.every((enemy) => enemy.equipment.length === 5));
  assert.ok(enemies.every((enemy) => enemy.equipment.filter((item) => item.category === 'weapon').length === 2));
  assert.ok(enemies.every((enemy) => enemy.equipment.flatMap((item) => item.tags).length === 4));
});
