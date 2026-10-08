import { TAG_ORDER } from '../game/TagCatalog.js';
import { WEAPONS } from '../game/ItemFactory.js';

export const PARTY_FEATURES = Object.freeze([
  ...Object.keys(WEAPONS).map(feature => ({ kind: 'weapon', feature, field: 'weapons' })),
  ...TAG_ORDER.map(feature => ({ kind: 'tag', feature, field: 'tags' })),
]);

function statistics(parties, field, feature) {
  const values = { parties: parties.length, wins: 0, losses: 0, draws: 0, totalOccurrences: 0, winOccurrences: 0, lossOccurrences: 0, drawOccurrences: 0 };
  parties.forEach(party => {
    const count = party[field][feature] ?? 0;
    const outcome = { win: 'wins', loss: 'losses', draw: 'draws' }[party.outcome];
    values[outcome]++;
    values.totalOccurrences += count;
    values[`${party.outcome}Occurrences`] += count;
  });
  return { ...values, winRate: parties.length ? values.wins / parties.length : null,
    lossRate: parties.length ? values.losses / parties.length : null,
    drawRate: parties.length ? values.draws / parties.length : null };
}

export function summarizePartyFeatures(parties) {
  return PARTY_FEATURES.flatMap(({ kind, feature, field }) => [false, true].map(present => ({ kind, feature, present,
    ...statistics(parties.filter(party => ((party[field][feature] ?? 0) > 0) === present), field, feature) })));
}

export function summarizePartyContributions(parties) {
  return PARTY_FEATURES.map(({ kind, feature, field }) => {
    const data = statistics(parties, field, feature);
    const total = data.totalOccurrences;
    return { kind, feature, total, wins: data.winOccurrences, losses: data.lossOccurrences, draws: data.drawOccurrences,
      winRate: total ? data.winOccurrences / total : null,
      lossRate: total ? data.lossOccurrences / total : null,
      drawRate: total ? data.drawOccurrences / total : null };
  });
}

export function summarizePartyFeatureCounts(parties) {
  return PARTY_FEATURES.flatMap(({ kind, feature, field }) => {
    const groups = new Map();
    parties.forEach(party => {
      const count = party[field][feature] ?? 0;
      if (!groups.has(count)) groups.set(count, []);
      groups.get(count).push(party);
    });
    return [...groups.entries()].toSorted(([a], [b]) => a - b).map(([count, entries]) => ({ kind, feature, count, ...statistics(entries, field, feature) }));
  });
}

export function toPartyLoadoutRows(parties) {
  return parties.map(({ heroTag, enemyTag, mainTag, trial, seed, side, outcome, ticks, weapons, tags }) => ({
    heroTag, enemyTag, mainTag, trial, seed, side, outcome, ticks,
    ...Object.fromEntries(PARTY_FEATURES.map(({ kind, feature }) => [`${kind}:${feature}`, (kind === 'weapon' ? weapons : tags)[feature] ?? 0])),
  }));
}
