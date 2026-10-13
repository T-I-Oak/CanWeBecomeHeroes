import GameStatistics from './GameStatistics.js';
import RunRankings from './RunRankings.js';

export const RUN_RECORDS_KEY = 'runRecords';
export const RUN_RECORDS_VERSION = 1;
export const RUN_HISTORY_LIMIT = 50;

function createData(legacyProgress) {
  return {
    version: RUN_RECORDS_VERSION, sequence: 0, completedSequence: 0,
    statistics: new GameStatistics().exportData(), history: [], rankings: [],
    summary: { completed: 0, cleared: 0, expired: 0, points: 0, highestPoints: 0 },
    clear: { count: 0, firstAt: null, lastAt: null },
    legacyClear: legacyProgress?.hasClearedTrial === true,
    unlockedProfessionIds: [],
  };
}

export default class RunRecordsRepository {
  constructor(dataManager) {
    this.dataManager = dataManager;
    const saved = dataManager.getValue(RUN_RECORDS_KEY);
    if (saved && saved.version !== RUN_RECORDS_VERSION) throw new RangeError(`Unsupported run records version: ${saved.version}`);
    this.data = saved ? structuredClone(saved) : createData(dataManager.getValue('heroProgress'));
    this.hasUnsavedChanges = false;
  }

  beginRun() {
    this.data.sequence += 1;
    return { sequence: this.data.sequence, run: new GameStatistics({ run: true }), total: new GameStatistics({ data: this.data.statistics }) };
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
    summary[record.outcome] += 1;
    summary.points += record.points;
    summary.highestPoints = Math.max(summary.highestPoints, record.points);
    if (record.outcome === 'cleared') {
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
