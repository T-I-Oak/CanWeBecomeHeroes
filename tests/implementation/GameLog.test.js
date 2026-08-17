import test from 'node:test';
import assert from 'node:assert/strict';
import GameLog from '../../src/game/GameLog.js';

test('game log keeps records in memory and notifies subscribers', () => {
  const log = new GameLog({ now: () => 1234 });
  const received = [];
  log.subscribe((record, level) => received.push({ record, level }));
  const record = log.log('アイテムを装備しました。', { level: 'hero' });
  assert.deepEqual(log.getRecords(), [record]);
  assert.equal(record.timestamp, 1234);
  assert.equal(received[0].level.label, 'キャラクター');
});

test('game log accepts future log levels and can suppress a notification', () => {
  const log = new GameLog();
  log.defineLevel('warning', { label: '注意', accent: '#cc5500', surface: '#fff0df' });
  const record = log.log('在庫が少なくなりました。', { level: 'warning', notify: false });
  assert.equal(record.level, 'warning');
  assert.equal(record.notify, false);
});
