import test from 'node:test';
import assert from 'node:assert/strict';
import TrialDeadlineWarning from '../../src/game/TrialDeadlineWarning.js';
import GameLog from '../../src/game/GameLog.js';
import GameClock from '../../src/game/GameClock.js';
import { getGuildTimeStatus, GAME_TICKS_PER_HOUR, INITIAL_TRIAL_HOURS } from '../../src/game/GuildTime.js';

test('deadline warnings fire exactly at 3, 2 and 1 days without repeated frames', () => {
  const log = new GameLog();
  const warnings = new TrialDeadlineWarning(log);
  for (const hours of [73, 72, 72, 71.9, 49, 48, 48, 25, 24, 24, 0]) warnings.update(hours);
  assert.deepEqual(log.getRecords().map(r => r.localized.values.days), [3, 2, 1]);
  assert.ok(log.getRecords().every(r => r.subject === 'system' && r.level === 'warning' && r.channel === 'event' && r.notify));
});

test('extension rearms every crossed boundary, including a boundary extended at the same tick', () => {
  const log = new GameLog();
  const warnings = new TrialDeadlineWarning(log);
  for (const hours of [72, 80, 72, 48, 60, 48, 24, 25, 24]) warnings.update(hours);
  assert.deepEqual(log.getRecords().map(r => r.localized.values.days), [3, 3, 2, 2, 1, 1]);
});

test('extension below the next boundary does not repeat an earlier warning', () => {
  const log = new GameLog();
  const warnings = new TrialDeadlineWarning(log);
  for (const hours of [71, 60, 70, 69, 48]) warnings.update(hours);
  assert.deepEqual(log.getRecords().map(r => r.localized.values.days), [3, 2]);
});

test('a time step crossing multiple boundaries reports them in chronological order', () => {
  const log = new GameLog();
  const warnings = new TrialDeadlineWarning(log);
  warnings.update(23);
  assert.deepEqual(log.getRecords().map(r => r.localized.values.days), [3, 2, 1]);
});

test('simulation pause does not warn and extension at a crossing permits the next crossing to warn again', () => {
  const log = new GameLog();
  const warnings = new TrialDeadlineWarning(log);
  const clock = new GameClock();
  let extensionHours = 0;
  const remaining = () => getGuildTimeStatus({ tick: clock.tick, contributionPoints: 0, extensionHours }).remainingHours;
  clock.tick = (INITIAL_TRIAL_HOURS - 72) * GAME_TICKS_PER_HOUR - 1;
  warnings.update(remaining());
  clock.pause('settings');
  clock.advance(1 / 60, () => warnings.update(remaining()));
  assert.equal(log.getRecords().length, 0);
  clock.resume('settings');
  clock.advance(1 / 60, () => {
    warnings.update(remaining());
    extensionHours += 1;
    warnings.update(remaining());
  });
  clock.tick += GAME_TICKS_PER_HOUR;
  warnings.update(remaining());
  assert.deepEqual(log.getRecords().map(r => r.localized.values.days), [3, 3]);
});
