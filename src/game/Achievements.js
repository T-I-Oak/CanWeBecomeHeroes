import { ACHIEVEMENT_DEFINITIONS } from './AchievementDefinitions.js';

function levelFor(definition, G, recorded) {
  if (!recorded) return { grade: 0, label: 'E', comment: 0, notice: 0 };
  for (let index = definition.levels.length - 1; index >= 0; index -= 1) {
    const level = definition.levels[index];
    // Formula roundoff must not put a value exactly on a boundary one level below it.
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(G), Math.abs(level.minG)) * 4;
    if (G >= level.minG - tolerance) return { grade: index + 1, label: level.label, comment: level.comment, notice: level.notice };
  }
  return { grade: 0, label: 'E', comment: 0, notice: 0 };
}

export default class Achievements {
  constructor({ definitions = ACHIEVEMENT_DEFINITIONS } = {}) {
    this.definitions = definitions;
  }

  evaluate(statistics, previousGrades = {}) {
    const grades = {};
    const gained = [];
    const notices = [];
    const entries = this.definitions.map(definition => {
      const p = definition.read(statistics.data);
      const recorded = Number.isFinite(p);
      const G = recorded ? definition.gradeFormula(p) : 0;
      if (!Number.isFinite(G)) throw new RangeError(`Invalid achievement G: ${definition.id}`);
      const level = levelFor(definition, G, recorded);
      const oldGrade = previousGrades[definition.id] ?? 0;
      const previousNotice = definition.levels[oldGrade - 1]?.notice ?? 0;
      grades[definition.id] = level.grade;
      const change = { id: definition.id, oldGrade, newGrade: level.grade };
      if (level.grade > oldGrade) gained.push(change);
      if (level.notice > previousNotice) notices.push(change);
      return { id: definition.id, category: definition.category, p: recorded ? p : null, G, ...level };
    });
    return { grades, gained, notices, entries };
  }

  evaluateRun({ startGrades, startG, total, run }) {
    const lifetime = this.evaluate(total, startGrades);
    const current = this.evaluate(run);
    const updated = new Set(lifetime.gained.map(item => item.id));
    // Capture cumulative growth, including progress below the next grade and above S+.
    const entries = lifetime.entries.map((entry, index) => ({
      ...entry, updated: updated.has(entry.id), runG: current.entries[index].G,
      startG: startG[entry.id], deltaG: entry.G - startG[entry.id],
    }));
    return {
      new: lifetime.gained,
      existing: entries.filter(entry => !entry.updated).map(({ id, grade }) => ({ id, grade })),
      entries,
    };
  }
}
