import test from 'node:test';
import assert from 'node:assert/strict';
import RunRecordsSaveController from '../../../src/app/RunRecordsSaveController.js';
import RunRecordsRepository from '../../../src/game/RunRecordsRepository.js';

test('quota failure remains visible until a retry saves the latest absolute record once', () => {
  const stored = new Map();
  let blocked = true;
  const repository = new RunRecordsRepository({ getValue: key => stored.get(key), setValue(key, value) {
    if (blocked) throw new DOMException('full', 'QuotaExceededError');
    stored.set(key, structuredClone(value));
  } });
  const notice = { visible: false, show() { this.visible = true; }, hide() { this.visible = false; } };
  const saver = new RunRecordsSaveController(repository, notice);
  const session = repository.beginRun();
  session.total.record({ type: 'defeat', enemyId: 'goblin', points: 10, level: 1 });
  assert.equal(saver.attempt(() => repository.checkpoint(session)), false);
  assert.equal(notice.visible, true);
  assert.equal(repository.hasUnsavedChanges, true);
  repository.complete(session, { id: 'r1', sequence: session.sequence, mode: 'trial', outcome: 'expired', endedAt: '2026-10-30T00:00:00Z', points: 10, defeats: 1, remainingHours: 0, clearedStages: 0 });
  notice.onRetry();
  assert.equal(notice.visible, true, 'another quota failure keeps the notice');
  blocked = false;
  notice.onRetry();
  assert.equal(notice.visible, false);
  assert.equal(repository.hasUnsavedChanges, false);
  const saved = stored.get('runRecords');
  assert.equal(saved.summary.completed, 1);
  assert.equal(saved.history.length, 1);
  assert.equal(saved.statistics.combat.points, 10);
  notice.onRetry();
  assert.deepEqual(stored.get('runRecords'), saved, 'retry never repeats finish or collection');
});

test('security failures are reported, ordinary saves dismiss the notice, and logic errors propagate', () => {
  const events = [];
  const notice = { show: () => events.push('show'), hide: () => events.push('hide') };
  const saver = new RunRecordsSaveController({ save() {} }, notice);
  assert.equal(saver.attempt(() => { throw new DOMException('blocked', 'SecurityError'); }), false);
  assert.equal(saver.attempt(() => {}), true);
  const bug = new RangeError('invalid record');
  assert.throws(() => saver.attempt(() => { throw bug; }), error => error === bug);
  assert.deepEqual(events, ['show', 'hide']);
});
