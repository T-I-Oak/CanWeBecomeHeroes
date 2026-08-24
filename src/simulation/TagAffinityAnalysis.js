import { runBattleSimulation } from './BattleSimulationRunner.js';

export const TAG_WEAPONS = Object.freeze({
  valor: 'sword', iron: 'shield', arcane: 'staff', cloth: 'holy-book', dexterity: 'claw',
  feather: 'bow', reputation: 'banner', gem: 'orb', blessing: 'holy-symbol', fortune: 'tarot-cards',
});

const DEFAULT_TAGS = Object.freeze(Object.keys(TAG_WEAPONS));
const DEFAULT_MAXIMUMS = Object.freeze({ power: 3, magic: 3, speed: 3, negotiation: 3, luck: 3, stamina: 1000000 });

function damage(result, side) {
  return result.averages.damageBySide[side] ?? 0;
}

function enemyShare(result) {
  const friendly = damage(result, 'left');
  const enemy = damage(result, 'right');
  return friendly + enemy === 0 ? 0 : enemy / (friendly + enemy);
}

function average(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function createHero(tag) {
  return { label: `${tag} x3`, tags: [tag, tag, tag], weapons: [TAG_WEAPONS[tag], TAG_WEAPONS[tag]], maximums: DEFAULT_MAXIMUMS, stamina: DEFAULT_MAXIMUMS.stamina };
}

function createEnemy(tag) {
  return { label: `${tag} x3`, tags: [tag, tag, tag], weapons: [TAG_WEAPONS[tag], TAG_WEAPONS[tag]], maximums: DEFAULT_MAXIMUMS, maximumHp: DEFAULT_MAXIMUMS.stamina };
}

function runMatch({ heroTag, enemyTags, ticks, trials, seed }) {
  return runBattleSimulation({
    ticks,
    trials,
    seed,
    left: [createHero(heroTag), createHero(heroTag)],
    right: enemyTags.map(createEnemy),
  });
}

export function analyzeTagSubAffinities({ tags = DEFAULT_TAGS, ticks = 1000, trials = 20, seed = 1 } = {}) {
  const selectedTags = [...tags];
  selectedTags.forEach((tag) => {
    if (!TAG_WEAPONS[tag]) throw new Error(`Tag '${tag}' does not have a corresponding weapon.`);
  });
  const baselines = new Map();
  let sequence = 0;
  const getBaseline = (heroTag, mainTag) => {
    const key = `${heroTag}:${mainTag}`;
    if (!baselines.has(key)) baselines.set(key, runMatch({ heroTag, enemyTags: [mainTag, mainTag], ticks, trials, seed: seed + sequence++ }));
    return baselines.get(key);
  };
  const details = [];
  selectedTags.forEach((heroTag) => selectedTags.forEach((mainTag) => selectedTags.forEach((subTag) => {
    const baseline = getBaseline(heroTag, mainTag);
    const comparison = subTag === mainTag
      ? baseline
      : runMatch({ heroTag, enemyTags: [mainTag, subTag], ticks, trials, seed: seed + sequence++ });
    const f0 = enemyShare(baseline);
    const ft2 = enemyShare(comparison);
    details.push({
      heroTag,
      mainTag,
      subTag,
      baselineFriendlyDamage: damage(baseline, 'left'),
      baselineEnemyDamage: damage(baseline, 'right'),
      f0,
      comparisonFriendlyDamage: damage(comparison, 'left'),
      comparisonEnemyDamage: damage(comparison, 'right'),
      ft2,
      shareDelta: ft2 - f0,
      subAffinity: f0 + ft2 === 0 ? 0.5 : ft2 / (f0 + ft2),
    });
  })));
  const summaries = selectedTags.flatMap((mainTag) => selectedTags.map((subTag) => {
    const rows = details.filter((row) => row.mainTag === mainTag && row.subTag === subTag);
    return {
      mainTag,
      subTag,
      averageBaselineEnemyShare: average(rows.map((row) => row.f0)),
      averageEnemyShare: average(rows.map((row) => row.ft2)),
      averageShareDelta: average(rows.map((row) => row.shareDelta)),
      averageSubAffinity: average(rows.map((row) => row.subAffinity)),
    };
  }));
  return { conditions: { tags: selectedTags, ticks, trials, seed, durability: DEFAULT_MAXIMUMS.stamina }, details, summaries };
}

export function toCsv(rows) {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  return [columns.join(','), ...rows.map((row) => columns.map((column) => row[column]).join(','))].join('\n');
}
