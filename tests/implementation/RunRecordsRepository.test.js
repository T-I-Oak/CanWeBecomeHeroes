import test from 'node:test';
import assert from 'node:assert/strict';
import RunRecordsRepository, { RUN_RECORDS_KEY, RUN_HISTORY_LIMIT } from '../../src/game/RunRecordsRepository.js';

function manager() {
  const values = new Map([['heroProgress', { hasClearedTrial: true, unlockedProfessionIds: ['swordfighter', 'guard', 'mage'] }], ['timeSettings', { speed: 4 }]]);
  return { values, getValue: key => values.get(key), setValue: (key, value) => values.set(key, structuredClone(value)) };
}

test('checkpoints retain unfinished statistics without inventing completion history or old dates', () => {
  const storage = manager();
  const repository = new RunRecordsRepository(storage);
  const session = repository.beginRun();
  session.total.record({ type: 'run-start', mode: 'trial', heroIds: ['Avery', 'Briar'] });
  repository.checkpoint(session);
  const loaded = new RunRecordsRepository(storage);
  assert.equal(loaded.beginRun().total.data.runs.trial['Avery|Briar'].started, 1);
  assert.deepEqual(loaded.data.history, []);
  assert.equal(loaded.data.clear.firstAt, null);
  assert.equal(loaded.data.legacyClear, true);
  assert.equal(storage.values.get('timeSettings').speed, 4);
  assert.equal(storage.values.get('heroProgress').unlockedProfessionIds.length, 3);
});

test('51 completions keep history at 50, stats and clear dates at all runs; old replay is ignored', () => {
  const repository = new RunRecordsRepository(manager());
  let first;
  for (let index = 1; index <= 51; index++) {
    const session = repository.beginRun();
    session.total.record({ type: 'defeat', enemyId: 'goblin', points: 10, level: 1 });
    const record = { id: `run-${session.sequence}`, sequence: session.sequence, mode: 'trial', outcome: 'cleared', endedAt: new Date(2026, 0, index).toISOString(), points: 10, remainingHours: index, defeats: index, clearedStages: 7 };
    repository.complete(session, record);
    repository.save();
    if (index === 1) first = { session, record };
  }
  repository.complete(first.session, first.record);
  assert.equal(repository.data.history.length, RUN_HISTORY_LIMIT);
  assert.equal(repository.data.summary.completed, 51);
  assert.equal(repository.data.summary.points, 510);
  assert.equal(repository.data.clear.count, 51);
  assert.equal(repository.data.statistics.combat.points, 510);
  assert.equal(repository.data.clear.firstAt, first.record.endedAt);
  assert.equal(repository.data.clear.lastAt, repository.data.history[0].endedAt);
});

test('highest-level clear time survives checkpoints and reload', () => {
  const storage = manager();
  const repository = new RunRecordsRepository(storage);
  const session = repository.beginRun();
  session.total.record({ type: 'stage-clear', kind: 'boss', patternIndex: 0, level: 17, clearedAt: '2026-10-16T01:00:00.000Z' });
  repository.checkpoint(session);
  const loaded = new RunRecordsRepository(storage);
  assert.equal(loaded.data.statistics.stages['boss:0'].highestLevelClearedAt, '2026-10-16T01:00:00.000Z');
});

test('failed storage writes are reported and retry writes same absolute data without double counting', () => {
  const storage = manager();
  const original = storage.setValue;
  const repository = new RunRecordsRepository(storage);
  const session = repository.beginRun();
  repository.complete(session, { id: 'r1', sequence: session.sequence, mode: 'trial', outcome: 'expired', endedAt: '2026-10-11T00:00:00Z', points: 5, defeats: 1, remainingHours: 0, clearedStages: 0 });
  storage.setValue = () => { throw new DOMException('full', 'QuotaExceededError'); };
  assert.throws(() => repository.save(), { name: 'QuotaExceededError' });
  storage.setValue = original;
  repository.save();
  repository.save();
  assert.equal(storage.getValue(RUN_RECORDS_KEY).summary.completed, 1);
});
