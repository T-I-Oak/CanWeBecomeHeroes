import GameStatistics from './GameStatistics.js';
import RunRankings from './RunRankings.js';
import { ACHIEVEMENT_DEFINITIONS } from './AchievementDefinitions.js';

export const RUN_RECORDS_KEY = 'runRecords';
export const RUN_HISTORY_LIMIT = 50;

function createData(legacyProgress) {
  return {
    sequence: 0, completedSequence: 0,
    statistics: new GameStatistics().exportData(), history: [], rankings: [],
    summary: { completed: 0, cleared: 0, expired: 0, points: 0, highestPoints: 0 },
    clear: { count: 0, firstAt: null, lastAt: null },
    legacyClear: legacyProgress?.hasClearedTrial === true,
    unlockedProfessionIds: [],
    knownAchievements: Object.fromEntries(ACHIEVEMENT_DEFINITIONS.map(({ id }) => [id, false])),
  };
}

export default class RunRecordsRepository {
  constructor(dataManager) {
    this.dataManager = dataManager;
    const saved = dataManager.getValue(RUN_RECORDS_KEY);
    const absent = saved === undefined;
    if (!absent) {
      if (saved === null || typeof saved !== 'object') throw new RangeError('Invalid run records data.');
      const known = saved.knownAchievements;
      if (!known || Object.keys(known).length !== ACHIEVEMENT_DEFINITIONS.length
        || ACHIEVEMENT_DEFINITIONS.some(({ id }) => typeof known[id] !== 'boolean')) {
        throw new RangeError('Invalid run records known achievements.');
      }
    }
    this.data = absent ? createData(dataManager.getValue('heroProgress')) : structuredClone(saved);
    this.hasUnsavedChanges = false;
  }

  beginRun() {
    this.data.sequence += 1;
    return { sequence: this.data.sequence, run: new GameStatistics({ run: true }), total: new GameStatistics({ data: this.data.statistics }) };
  }

  markAchievementsKnown(ids) {
    for (const id of ids) {
      if (!Object.hasOwn(this.data.knownAchievements, id)) throw new RangeError(`Unknown achievement: ${id}`);
      if (this.data.knownAchievements[id]) continue;
      this.data.knownAchievements[id] = true;
      this.hasUnsavedChanges = true;
    }
  }

  checkpoint(session) {
    this.data.statistics = session.total.exportData();
    this.hasUnsavedChanges = true;
    this.save();
  }

  complete(session, record) {
    if (session.sequence <= this.data.completedSequence) return;
    this.data.completedSequence = session.sequence;
    this.hasUnsavedChanges = true;
    this.data.statistics = session.total.exportData();
    const summary = this.data.summary;
    summary.completed += 1;
    if (record.mode === 'trial') summary[record.outcome] += 1;
    summary.points += record.points;
    summary.highestPoints = Math.max(summary.highestPoints, record.points);
    if (record.mode === 'trial' && record.outcome === 'cleared') {
      this.data.clear.count += 1;
      this.data.clear.firstAt ??= record.endedAt;
      this.data.clear.lastAt = record.endedAt;
      this.data.unlockedProfessionIds = [...new Set([...this.data.unlockedProfessionIds, ...(record.members ?? []).map(member => member.profession)])];
    }
    this.data.history.unshift(structuredClone(record));
    this.data.history.length = Math.min(this.data.history.length, RUN_HISTORY_LIMIT);
    const rankings = new RunRankings(this.data.rankings);
    rankings.add(record);
    this.data.rankings = rankings.data;
  }

  save() {
    // Write an absolute state: retry never replays collection or completion.
    this.dataManager.setValue(RUN_RECORDS_KEY, structuredClone(this.data));
    this.hasUnsavedChanges = false;
  }
}
