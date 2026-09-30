import test from 'node:test';
import assert from 'node:assert/strict';
import { coupleSpeedLogs, DEFAULT_TIME_SETTINGS, getSpeedFromLog, normalizeSpeedLog, readTimeSettings, TIME_SETTINGS_KEY, writeTimeSettings } from '../../src/game/GameSpeedSettings.js';

test('speed log maps the configured logarithmic range to multiplicative game speed', () => {
  assert.equal(getSpeedFromLog(-1), 0.5);
  assert.equal(getSpeedFromLog(0), 1);
  assert.equal(getSpeedFromLog(1), 2);
  assert.equal(getSpeedFromLog(2), 4);
  assert.equal(normalizeSpeedLog(0.26), 0.3);
  assert.equal(normalizeSpeedLog(-3), -1);
  assert.equal(normalizeSpeedLog(3), 2);
});

test('speed thumbs stay ordered when either one crosses the other', () => {
  assert.deepEqual(coupleSpeedLogs({ speedLog: 1.2, acceleratedSpeedLog: 0.4, moved: 'normal' }), {
    speedLog: 1.2,
    acceleratedSpeedLog: 1.2,
  });
  assert.deepEqual(coupleSpeedLogs({ speedLog: 1, acceleratedSpeedLog: 0.2, moved: 'accelerated' }), {
    speedLog: 0.2,
    acceleratedSpeedLog: 0.2,
  });
  assert.deepEqual(coupleSpeedLogs({ speedLog: 0, acceleratedSpeedLog: 1, moved: 'normal' }), {
    speedLog: 0,
    acceleratedSpeedLog: 1,
  });
});

test('time settings are restored from and saved through the common data manager', () => {
  const values = new Map();
  const dataManager = { getValue: (key) => values.get(key), setValue: (key, value) => values.set(key, value) };
  assert.deepEqual(readTimeSettings(dataManager), DEFAULT_TIME_SETTINGS);
  assert.deepEqual(writeTimeSettings({ speedLog: 1.04, pauseOnInformation: false, pauseOnStaminaFull: true, accelerateWithoutPreparation: true }, dataManager), {
    speedLog: 1,
    acceleratedSpeedLog: 2,
    pauseOnInformation: false,
    pauseOnStaminaFull: true,
    accelerateWithoutPreparation: true,
  });
  assert.deepEqual(values.get(TIME_SETTINGS_KEY), {
    speedLog: 1,
    acceleratedSpeedLog: 2,
    pauseOnInformation: false,
    pauseOnStaminaFull: true,
    accelerateWithoutPreparation: true,
  });
  assert.deepEqual(readTimeSettings(dataManager), values.get(TIME_SETTINGS_KEY));
});
