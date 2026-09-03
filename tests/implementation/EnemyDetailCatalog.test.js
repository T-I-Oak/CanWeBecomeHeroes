import assert from 'node:assert/strict';
import test from 'node:test';
import { ENEMY_DETAILS, getEnemyDetail } from '../../src/game/EnemyDetailCatalog.js';

test('enemy detail catalog gives every implemented enemy a description and combat style', () => {
  assert.equal(Object.keys(ENEMY_DETAILS).length, 19);
  Object.values(ENEMY_DETAILS).forEach((detail) => {
    assert.notEqual(detail.description, '');
    assert.notEqual(detail.combatStyle, '');
  });
});

test('enemy detail catalog resolves details by definition id', () => {
  assert.match(getEnemyDetail('large-vitality').combatStyle, /トレント/);
});
