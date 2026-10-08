import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePartyFeatures, summarizePartyFeatureCounts, summarizePartyContributions } from '../../src/simulation/PartyLoadoutAnalysis.js';
import { analyzeTagMatchups } from '../../src/simulation/TagMatchupMatrix.js';

test('feature analysis separates cumulative quantities from party counts and includes absence', () => {
  const parties = [
    { weapons: { 'holy-symbol': 2 }, tags: { vitality: 3 }, outcome: 'draw' },
    { weapons: { 'holy-symbol': 1 }, tags: { vitality: 1 }, outcome: 'win' },
    { weapons: { sword: 2 }, tags: { valor: 2 }, outcome: 'loss' },
  ];
  const rows = summarizePartyFeatures(parties).filter(row => row.kind === 'weapon' && row.feature === 'holy-symbol');
  const present = rows.find(row => row.present);
  assert.equal(present.parties, 2);
  assert.equal(present.totalOccurrences, 3);
  assert.equal(present.drawOccurrences, 2);
  assert.equal(present.drawRate, 0.5);
  assert.equal(rows.find(row => !row.present).lossRate, 1);
  const bins = summarizePartyFeatureCounts(parties).filter(row => row.kind === 'tag' && row.feature === 'vitality');
  assert.deepEqual(bins.map(row => row.count), [0, 1, 3]);
  assert.equal(bins.find(row => row.count === 3).drawRate, 1);
  const contribution = summarizePartyContributions(parties).find(row => row.feature === 'holy-symbol');
  assert.equal(contribution.total, 3);
  assert.equal(contribution.wins, 1);
  assert.equal(contribution.draws, 2);
  assert.equal(contribution.drawRate, 2 / 3);
});

test('collecting initial party loadouts includes intrinsic tags and does not change outcomes', () => {
  const input = { tags: ['water', 'blessing'], equipmentTagBudget: 6, ticks: 900, trials: 2, seed: 7 };
  const before = analyzeTagMatchups(input);
  const after = analyzeTagMatchups({ ...input, collectPartyLoadouts: true });
  assert.deepEqual(after.matchups, before.matchups);
  assert.equal(after.partyLoadouts.length, 16);
  after.partyLoadouts.forEach(party => {
    assert.equal(Object.values(party.weapons).reduce((a, b) => a + b, 0), 6);
    assert.equal(Object.values(party.tags).reduce((a, b) => a + b, 0), party.side === 'left' ? 24 : 21);
    assert.ok(['win', 'loss', 'draw'].includes(party.outcome));
  });
});
