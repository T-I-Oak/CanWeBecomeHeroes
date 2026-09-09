import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpeedFromLog, normalizeSpeedLog, readSpeedLog, SPEED_LOG_STORAGE_KEY, writeSpeedLog } from '../../src/game/GameSpeedSettings.js';

test('speed log maps the configured logarithmic range to multiplicative game speed', () => {
  assert.equal(getSpeedFromLog(-1), 0.5);
  assert.equal(getSpeedFromLog(0), 1);
  assert.equal(getSpeedFromLog(1), 2);
  assert.equal(getSpeedFromLog(2), 4);
  assert.equal(normalizeSpeedLog(0.26), 0.3);
  assert.equal(normalizeSpeedLog(-3), -1);
  assert.equal(normalizeSpeedLog(3), 2);
});

test('speed log is restored from and saved to browser storage', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(readSpeedLog(storage), 0);
  assert.equal(writeSpeedLog(1.04, storage), 1);
  assert.equal(values.get(SPEED_LOG_STORAGE_KEY), '1');
  assert.equal(readSpeedLog(storage), 1);
});
