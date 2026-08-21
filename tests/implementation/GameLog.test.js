import test from 'node:test';
import assert from 'node:assert/strict';
import GameLog from '../../src/game/GameLog.js';

test('game log keeps records in memory and notifies subscribers', () => {
  const log = new GameLog({ now: () => 1234 });
  const received = [];
  log.subscribe((record, definitions) => received.push({ record, definitions }));
  const record = log.log('アイテムを装備しました。', { subject: 'hero', level: 'info' });
  assert.deepEqual(log.getRecords(), [record]);
  assert.equal(record.timestamp, 1234);
  assert.equal(record.subject, 'hero');
  assert.equal(received[0].definitions.subject.label, 'キャラクター');
  assert.equal(received[0].definitions.level.label, '情報');
});

test('game log accepts future log levels and can suppress a notification', () => {
  const log = new GameLog();
  log.defineLevel('warning', { label: '注意' });
  log.defineSubject('inventory', { label: '倉庫' });
  const record = log.log('在庫が少なくなりました。', { subject: 'inventory', level: 'warning', notify: false });
  assert.equal(record.subject, 'inventory');
  assert.equal(record.level, 'warning');
  assert.equal(record.notify, false);
});
