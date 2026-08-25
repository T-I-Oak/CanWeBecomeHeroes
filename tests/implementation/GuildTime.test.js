import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatElapsedGuildTime,
  formatRemainingGuildTime,
  GAME_TICKS_PER_HOUR,
  getGuildTimeStatus,
  GUILD_TIMELINE_STANDARD_HOURS,
} from '../../src/game/GuildTime.js';

test('guild time uses five hundred ticks per hour with a seven-day initial deadline', () => {
  const status = getGuildTimeStatus({ tick: GAME_TICKS_PER_HOUR * 25, contributionPoints: 200 });

  assert.equal(status.elapsedHours, 25);
  assert.equal(status.remainingHours, 143);
  assert.equal(status.estimatedExtensionHours, 20);
  assert.equal(status.timelineHours, GUILD_TIMELINE_STANDARD_HOURS);
  assert.equal(formatElapsedGuildTime(status.elapsedHours), '1日 1時間');
  assert.equal(formatRemainingGuildTime(status.remainingHours), '5日 23時間');
});

test('guild timeline switches to a proportional horizon after fourteen days', () => {
  const status = getGuildTimeStatus({ tick: GAME_TICKS_PER_HOUR * 350, contributionPoints: 240 });

  assert.equal(status.remainingHours, 0);
  assert.equal(status.estimatedExtensionHours, 24);
  assert.equal(status.timelineHours, 374);
});
