import test from 'node:test';
import assert from 'node:assert/strict';
import { TAG_TEAM_COMPOSITIONS, TAG_WEAPON_LOADOUTS, analyzeTagMatchups, summarizeTagOutcomes, toMatchupMatrixCsv, toMatchupMatrixMarkdown, toTagOutcomeSummaryMarkdown } from '../../src/simulation/TagMatchupMatrix.js';

test('tag matchup matrix defines every tag with a two-weapon loadout', () => {
  assert.deepEqual(TAG_WEAPON_LOADOUTS.fire, ['sword', 'shield']);
  assert.deepEqual(TAG_WEAPON_LOADOUTS.water, ['staff', 'holy-book']);
  assert.deepEqual(TAG_WEAPON_LOADOUTS.lightning, ['claw', 'bow']);
  assert.deepEqual(TAG_WEAPON_LOADOUTS.area, ['banner', 'orb']);
  assert.deepEqual(TAG_WEAPON_LOADOUTS.vitality, ['holy-symbol', 'tarot-cards']);
  assert.deepEqual(TAG_TEAM_COMPOSITIONS.valor, ['valor', 'lightning', 'arcane']);
});

test('tag matchup matrix produces a square hero win-rate table', () => {
  const analysis = analyzeTagMatchups({ tags: ['valor', 'iron'], ticks: 20, trials: 2, seed: 1 });
  assert.equal(analysis.matchups.length, 4);
  assert.deepEqual(analysis.conditions.teamRoles, ['main', 'support1', 'support2']);
  assert.equal(toMatchupMatrixCsv(analysis).split('\n').length, 3);
  assert.match(toMatchupMatrixMarkdown(analysis), /武勇/);
  assert.match(toTagOutcomeSummaryMarkdown(analysis), /鉄/);
  assert.ok(analysis.matchups.every(({ heroWinRate }) => heroWinRate >= 0 && heroWinRate <= 1));
});

test('tag outcome summary combines hero and enemy perspectives', () => {
  const analysis = analyzeTagMatchups({ tags: ['valor', 'iron'], ticks: 20, trials: 2, seed: 1 });
  const summary = summarizeTagOutcomes(analysis);
  assert.equal(summary.length, 2);
  summary.forEach(({ wins, losses, draws, total }) => {
    assert.equal(wins + losses + draws, total);
    assert.equal(total, 8);
  });
});
