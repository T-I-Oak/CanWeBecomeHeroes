import test from 'node:test';
import assert from 'node:assert/strict';
import { TAG_WEAPON_LOADOUTS, analyzeTagMatchups, toMatchupMatrixCsv } from '../../src/simulation/TagMatchupMatrix.js';

test('tag matchup matrix defines every tag with a two-weapon loadout', () => {
  assert.deepEqual(TAG_WEAPON_LOADOUTS.fire, ['sword', 'shield']);
  assert.deepEqual(TAG_WEAPON_LOADOUTS.water, ['staff', 'holy-book']);
  assert.deepEqual(TAG_WEAPON_LOADOUTS.lightning, ['claw', 'bow']);
  assert.deepEqual(TAG_WEAPON_LOADOUTS.area, ['banner', 'orb']);
  assert.deepEqual(TAG_WEAPON_LOADOUTS.vitality, ['holy-symbol', 'tarot-cards']);
});

test('tag matchup matrix produces a square hero win-rate table', () => {
  const analysis = analyzeTagMatchups({ tags: ['valor', 'iron'], ticks: 20, trials: 2, seed: 1 });
  assert.equal(analysis.matchups.length, 4);
  assert.equal(toMatchupMatrixCsv(analysis).split('\n').length, 3);
  assert.ok(analysis.matchups.every(({ heroWinRate }) => heroWinRate >= 0 && heroWinRate <= 1));
});
