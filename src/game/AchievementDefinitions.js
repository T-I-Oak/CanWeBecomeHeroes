import { ENEMY_CATALOG } from './EnemyCatalog.js';
import { TAGS } from './TagCatalog.js';
import texts from '../../public/data/text/achievement.json' with { type: 'json' };
import enemyTexts from '../../public/data/text/information/enemy.json' with { type: 'json' };
import tagTexts from '../../public/data/text/information/tag.json' with { type: 'json' };
import heroTexts from '../../public/data/text/information/hero.json' with { type: 'json' };
import facilityTexts from '../../public/data/text/information/facility.json' with { type: 'json' };

export const THREE_LEVELS = Object.freeze(['B+', 'A+', 'S+'].map((label, index) => Object.freeze({ minG: index + 1, label, comment: index + 1, notice: index + 1 })));

export const FIFTEEN_LEVELS = Object.freeze(['D', 'C', 'B', 'A', 'S'].flatMap((letter, group) =>
  ['-', '', '+'].map((suffix, offset) => Object.freeze({
    minG: group * 3 + offset + 1,
    label: `${letter}${suffix}`,
    comment: group < 2 ? 1 : group < 4 ? 2 : 3,
    notice: group + 1,
  })),
));

function sumRecorded(values) {
  const recorded = values.filter(Number.isFinite);
  return recorded.length ? recorded.reduce((sum, value) => sum + value, 0) : undefined;
}
const sumRuns = (mode, field) => data => sumRecorded(Object.values(data.runs?.[mode] ?? {}).map(counts => counts[field]));
const pairStarts = pair => data => sumRecorded(Object.values(data.runs ?? {}).map(pairs => pairs[pair]?.started));
const fill = (template, values) => template.replace(/\{(\w+)\}|［敵名］/g, (match, key) => values[key ?? 'enemy'] ?? match);
const name = (catalog, id, language) => catalog[id].name['lang-store'][language];

function resources(key, category, condition, variables, tagId) {
  return Object.freeze(Object.fromEntries(['ja', 'en'].map(language => {
    const localized = texts.items[key]['lang-store'][language];
    const values = variables(language);
    const comments = localized.comments.map((template, index) => fill(template, tagId
      ? { ...values, skill: tagTexts[tagId].skillNames['lang-store'][language][index + 1] }
      : values));
    return [language, Object.freeze({
      category: texts.categories['lang-store'][language][category],
      label: fill(localized.label, values),
      condition: fill(texts.conditions[condition][language], values),
      comments: Object.freeze(comments),
      unachieved: texts.unachieved['lang-store'][language],
    })];
  })));
}

function definition({ id, category, read, t, key = id, condition = id, variables = () => ({}), levels, tagId }) {
  return Object.freeze({
    id, category, read, levels, s: levels.at(-1).minG, t,
    gradeFormula: tagId ? p => (p - 1) / 2 : p => Math.cbrt(p / t) * levels.at(-1).minG,
    resources: resources(key, category, condition, variables, tagId),
  });
}

// The level table is injectable: category-specific presentation does not live in the evaluator.
export function createAchievementDefinitions({ normalLevels = FIFTEEN_LEVELS, tagLevels = THREE_LEVELS } = {}) {
  const normal = options => definition({ ...options, levels: normalLevels });
  return Object.freeze([
    ...['Avery|Briar', 'Casey|Darcy', 'Ellis|Finley', 'Garnet|Harper'].map(pair => normal({
      id: `pair-start:${pair}`, category: 'pair', read: pairStarts(pair), t: 20, key: `pair:${pair}`, condition: 'pair',
      variables: language => ({ heroes: pair.split('|').map(id => name(heroTexts, id, language)).join(language === 'ja' ? '・' : ' & ') }),
    })),
    ...[
      ['trial-start', 'trial', 'started', 60], ['trial-clear', 'trial', 'cleared', 20],
      ['trial-fail', 'trial', 'expired', 20], ['challenge-start', 'challenge', 'started', 60],
    ].map(([id, mode, field, t]) => normal({ id, category: 'run', read: sumRuns(mode, field), t })),
    normal({ id: 'stage-clear', category: 'stage', read: data => sumRecorded(Object.values(data.stages ?? {}).map(stage => stage.clears)), t: 100 }),
    ...Object.values(ENEMY_CATALOG).filter(enemy => !enemy.id.startsWith('phantom-')).map(enemy => normal({
      id: `enemy-defeat:${enemy.id}`, category: 'enemy', read: data => data.combat?.enemies?.[enemy.id],
      t: { small: 100, medium: 60, large: 20 }[enemy.size], key: `enemy:${enemy.size}`, condition: 'enemy',
      variables: language => ({ enemy: name(enemyTexts, enemy.id, language) }),
    })),
    normal({ id: 'contribution', category: 'contribution', read: data => data.guildPoints, t: 20000 }),
    ...[['shop', 400], ['guild', 100], ['training', 400]].map(([id, t]) => normal({
      id: `facility:${id}`, category: 'facility', read: data => data.facilities?.[id], t, condition: 'facility',
      variables: language => ({ facility: name(facilityTexts, id, language) }),
    })),
    ...Object.keys(TAGS).filter(tag => TAGS[tag].group === 'status').map(tag => definition({
      id: `tag:${tag}`, category: 'tag', key: 'tag', condition: 'tag', tagId: tag, levels: tagLevels,
      read: data => {
        const values = Object.values(data.heroes ?? {}).map(hero => hero.tags?.[tag]).filter(Number.isFinite);
        return values.length ? Math.max(...values) : undefined;
      },
      variables: language => ({ tag: name(tagTexts, tag, language) }),
    })),
  ]);
}

export const ACHIEVEMENT_DEFINITIONS = createAchievementDefinitions();
