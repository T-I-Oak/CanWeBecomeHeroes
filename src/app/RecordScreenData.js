import Achievements from '../game/Achievements.js';
import GameStatistics from '../game/GameStatistics.js';
import { ACHIEVEMENT_DEFINITIONS } from '../game/AchievementDefinitions.js';
import { COMBINATION_PATTERNS } from '../game/EncounterDefinitions.js';

/** Find the first integer that the existing grade formula accepts. */
export function getAchievementProgress(definition, entry) {
  const current = entry.p ?? 0;
  const next = definition.levels[entry.grade];
  if (!next) return { current, target: null, ratio: 1 };
  const reaches = value => {
    const grade = definition.gradeFormula(value);
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(grade), Math.abs(next.minG)) * 4;
    return grade >= next.minG - tolerance;
  };
  let low = 0, high = 1;
  while (!reaches(high)) high *= 2;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (reaches(middle)) high = middle;
    else low = middle;
  }
  return { current, target: high, ratio: Math.min(1, current / high) };
}

export function getRecordAchievements(data, language, knownAchievements) {
  return new Achievements().evaluate(new GameStatistics({ data })).entries.map((entry, index) => {
    const definition = ACHIEVEMENT_DEFINITIONS[index];
    const resource = definition.resources[language];
    return {
      id: entry.id, grade: entry.grade, categoryId: entry.category, category: resource.category,
      label: resource.label, condition: resource.recordCondition,
      gradeLabel: entry.label, progress: getAchievementProgress(definition, entry),
    };
  }).filter(entry => entry.grade > 0 || knownAchievements[entry.id]);
}

export function getTaskRecords(data) {
  return Object.entries(COMBINATION_PATTERNS).map(([kind, patterns]) => ({
    kind, entries: patterns.map((pattern, index) => ({
      pattern, patternIndex: index, highestLevel: data.stages[`${kind}:${index}`]?.highestLevel ?? null,
      highestLevelClearedAt: data.stages[`${kind}:${index}`]?.highestLevelClearedAt,
    })).filter(entry => entry.highestLevel !== null)
      .sort((left, right) => right.highestLevel - left.highestLevel
        || right.highestLevelClearedAt.localeCompare(left.highestLevelClearedAt)
        || left.patternIndex - right.patternIndex).slice(0, 5),
  }));
}
