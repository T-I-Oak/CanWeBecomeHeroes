import { TAG_ORDER } from '../game/TagCatalog.js';
import gameText from '../../public/data/game_text.json' with { type: 'json' };
import { expandLanguageResource } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import { COMBINATION_PATTERNS } from '../game/EncounterDefinitions.js';
import { getEnemyDefinitionById } from '../game/EnemyCatalog.js';
import { runBattleSimulation } from './BattleSimulationRunner.js';

// Offline reports use the same resource and language resolver as the game.
function getTagDetail(tag) {
  return expandLanguageResource(gameText.information.tag[tag]);
}

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

export const TAG_TEAM_COMPOSITIONS = Object.freeze(Object.fromEntries(COMBINATION_PATTERNS.regular.map((pattern) => {
  const tags = [pattern.main, pattern.support1, pattern.support2].map((enemyDefinitionId) => getEnemyDefinitionById(enemyDefinitionId).tagAffinity);
  return [tags[0], Object.freeze(tags)];
})));

function createCombatant(tag, role) {
  return {
    label: `${role}:${tag} x3`,
    tags: [tag, tag, tag],
    weapons: TAG_WEAPON_LOADOUTS[tag],
    maximums: DEFAULT_MAXIMUMS,
    stamina: DEFAULT_MAXIMUMS.stamina,
  };
}

function createHeroTeam(mainTag) {
  return TAG_TEAM_COMPOSITIONS[mainTag].map((tag, index) => createCombatant(tag, ['main', 'support1', 'support2'][index]));
}

function createEnemyTeam(mainTag) {
  return TAG_TEAM_COMPOSITIONS[mainTag].map((tag, index) => ({
    ...createCombatant(tag, ['main', 'support1', 'support2'][index]),
    maximumHp: DEFAULT_MAXIMUMS.stamina,
  }));
}

export function analyzeTagMatchups({ tags = TAG_ORDER, heroTags = tags, enemyTags = tags, ticks = 6000, trials = 200, seed = 1 } = {}) {
  const selectedTags = [...tags];
  const selectedHeroTags = [...heroTags];
  const selectedEnemyTags = [...enemyTags];
  [...selectedHeroTags, ...selectedEnemyTags].forEach((tag) => {
    if (!TAG_WEAPON_LOADOUTS[tag]) throw new Error(`Tag '${tag}' does not have a matchup weapon loadout.`);
    if (!TAG_TEAM_COMPOSITIONS[tag]) throw new Error(`Tag '${tag}' does not have a main/support team composition.`);
  });
  let sequence = 0;
  const matchups = selectedHeroTags.flatMap((heroTag) => selectedEnemyTags.map((enemyTag) => {
    const result = runBattleSimulation({
      ticks,
      trials,
      seed: seed + sequence++,
      left: createHeroTeam(heroTag),
      right: createEnemyTeam(enemyTag),
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
    conditions: Object.freeze({ tags: selectedTags, heroTags: selectedHeroTags, enemyTags: selectedEnemyTags, tagCount: 3, teamRoles: Object.freeze(['main', 'support1', 'support2']), ticks, trials, seed, maximums: DEFAULT_MAXIMUMS, warehouseItems: 'none' }),
    matchups: Object.freeze(matchups),
  });
}

// 各タグをHero側・Enemy側の両方から見る。1行は 15対戦相手 × 2陣営 × trials 件。
export function summarizeTagOutcomes(analysis) {
  const { tags, trials } = analysis.conditions;
  return tags.map((tag) => {
    const asHero = analysis.matchups.filter((matchup) => matchup.heroTag === tag);
    const asEnemy = analysis.matchups.filter((matchup) => matchup.enemyTag === tag);
    const wins = asHero.reduce((total, matchup) => total + matchup.heroWins, 0)
      + asEnemy.reduce((total, matchup) => total + matchup.enemyWins, 0);
    const losses = asHero.reduce((total, matchup) => total + matchup.enemyWins, 0)
      + asEnemy.reduce((total, matchup) => total + matchup.heroWins, 0);
    const draws = asHero.reduce((total, matchup) => total + matchup.draws, 0)
      + asEnemy.reduce((total, matchup) => total + matchup.draws, 0);
    return Object.freeze({ tag, wins, losses, draws, total: tags.length * trials * 2 });
  });
}

export function toTagOutcomeSummaryCsv(analysis) {
  return [
    'tag,wins,losses,draws,total',
    ...summarizeTagOutcomes(analysis).map(({ tag, wins, losses, draws, total }) => [tag, wins, losses, draws, total].join(',')),
  ].join('\n');
}

export function toTagOutcomeSummaryMarkdown(analysis) {
  return [
    `タグ別勝敗合計（Hero側・Enemy側を合算、各${analysis.conditions.trials.toLocaleString()}試行）`,
    '',
    '| タグ | 勝 | 負 | 引分 | 合計 |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...summarizeTagOutcomes(analysis).map(({ tag, wins, losses, draws, total }) => `| ${getTagDetail(tag).name} | ${wins.toLocaleString()} | ${losses.toLocaleString()} | ${draws.toLocaleString()} | ${total.toLocaleString()} |`),
  ].join('\n');
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
    `勝率（行: Hero主タグの3人編成 / 列: Enemy主タグの3人編成、各${analysis.conditions.trials.toLocaleString()}試行）`,
    '',
    `| Hero \\ Enemy | ${tags.map((tag) => getTagDetail(tag).name).join(' | ')} |`,
    `| --- | ${tags.map(() => '---:').join(' | ')} |`,
    ...tags.map((heroTag) => `| ${getTagDetail(heroTag).name} | ${tags.map((enemyTag) => `${(rows.get(`${heroTag}:${enemyTag}`).heroWinRate * 100).toFixed(1)}%`).join(' | ')} |`),
  ].join('\n');
}
