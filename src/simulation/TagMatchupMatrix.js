import { TAG_ORDER } from '../game/TagCatalog.js';
import { getTagDetail } from '../game/TagDetailCatalog.js';
import { runBattleSimulation } from './BattleSimulationRunner.js';

export const TAG_WEAPON_LOADOUTS = Object.freeze({
  valor: Object.freeze(['sword', 'sword']),
  arcane: Object.freeze(['staff', 'staff']),
  dexterity: Object.freeze(['claw', 'claw']),
  reputation: Object.freeze(['banner', 'banner']),
  blessing: Object.freeze(['holy-symbol', 'holy-symbol']),
  iron: Object.freeze(['shield', 'shield']),
  cloth: Object.freeze(['holy-book', 'holy-book']),
  feather: Object.freeze(['bow', 'bow']),
  gem: Object.freeze(['orb', 'orb']),
  fortune: Object.freeze(['tarot-cards', 'tarot-cards']),
  fire: Object.freeze(['sword', 'shield']),
  water: Object.freeze(['staff', 'holy-book']),
  lightning: Object.freeze(['claw', 'bow']),
  area: Object.freeze(['banner', 'orb']),
  vitality: Object.freeze(['holy-symbol', 'tarot-cards']),
});

const DEFAULT_MAXIMUMS = Object.freeze({ power: 3, magic: 3, speed: 3, negotiation: 3, luck: 3, stamina: 3 });

function createHero(tag) {
  return {
    label: `${tag} x3`,
    tags: [tag, tag, tag],
    weapons: TAG_WEAPON_LOADOUTS[tag],
    maximums: DEFAULT_MAXIMUMS,
    stamina: DEFAULT_MAXIMUMS.stamina,
  };
}

function createEnemy(tag) {
  return {
    label: `${tag} x3`,
    tags: [tag, tag, tag],
    weapons: TAG_WEAPON_LOADOUTS[tag],
    maximums: DEFAULT_MAXIMUMS,
    maximumHp: DEFAULT_MAXIMUMS.stamina,
  };
}

export function analyzeTagMatchups({ tags = TAG_ORDER, ticks = 1000, trials = 1000, seed = 1 } = {}) {
  const selectedTags = [...tags];
  selectedTags.forEach((tag) => {
    if (!TAG_WEAPON_LOADOUTS[tag]) throw new Error(`Tag '${tag}' does not have a matchup weapon loadout.`);
  });
  let sequence = 0;
  const matchups = selectedTags.flatMap((heroTag) => selectedTags.map((enemyTag) => {
    const result = runBattleSimulation({
      ticks,
      trials,
      seed: seed + sequence++,
      left: [createHero(heroTag)],
      right: [createEnemy(enemyTag)],
    });
    return {
      heroTag,
      enemyTag,
      heroWinRate: result.outcomes.leftWinRate,
      enemyWinRate: result.outcomes.rightWinRate,
      drawRate: result.outcomes.draws / trials,
      heroWins: result.outcomes.leftWins,
      enemyWins: result.outcomes.rightWins,
      draws: result.outcomes.draws,
    };
  }));
  return Object.freeze({
    conditions: Object.freeze({ tags: selectedTags, tagCount: 3, ticks, trials, seed, maximums: DEFAULT_MAXIMUMS }),
    matchups: Object.freeze(matchups),
  });
}

export function toMatchupMatrixCsv(analysis) {
  const { tags } = analysis.conditions;
  const rows = new Map(analysis.matchups.map((matchup) => [`${matchup.heroTag}:${matchup.enemyTag}`, matchup]));
  return [
    ['heroTag', ...tags].join(','),
    ...tags.map((heroTag) => [heroTag, ...tags.map((enemyTag) => rows.get(`${heroTag}:${enemyTag}`).heroWinRate.toFixed(4))].join(',')),
  ].join('\n');
}

export function toMatchupMatrixMarkdown(analysis) {
  const { tags } = analysis.conditions;
  const rows = new Map(analysis.matchups.map((matchup) => [`${matchup.heroTag}:${matchup.enemyTag}`, matchup]));
  return [
    `勝率（行: Hero / 列: Enemy、各${analysis.conditions.trials.toLocaleString()}試行）`,
    '',
    `| Hero \\ Enemy | ${tags.map((tag) => getTagDetail(tag).name).join(' | ')} |`,
    `| --- | ${tags.map(() => '---:').join(' | ')} |`,
    ...tags.map((heroTag) => `| ${getTagDetail(heroTag).name} | ${tags.map((enemyTag) => `${(rows.get(`${heroTag}:${enemyTag}`).heroWinRate * 100).toFixed(1)}%`).join(' | ')} |`),
  ].join('\n');
}
