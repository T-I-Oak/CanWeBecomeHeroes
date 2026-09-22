import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_OVERHEAD_STATUS_SETTINGS,
  getOverheadStatusValue,
  getRotatingOverheadStatus,
  isOverheadStatusVisible,
  normalizeOverheadStatusSettings,
  OVERHEAD_STATUS_VISIBILITY,
  readOverheadStatusSettings,
  writeOverheadStatusSettings,
} from '../../src/game/OverheadStatusSettings.js';

test('overhead status settings retain supported selections and rotate them every second', () => {
  const values = new Map();
  const dataManager = { getValue: (key) => values.get(key), setValue: (key, value) => values.set(key, value) };
  assert.deepEqual(readOverheadStatusSettings(dataManager), DEFAULT_OVERHEAD_STATUS_SETTINGS);
  const settings = writeOverheadStatusSettings({ statuses: ['power', 'weight', 'power', 'unknown'], visibility: 'battle' }, dataManager);
  assert.deepEqual(settings, { statuses: ['power', 'weight'], visibility: 'battle' });
  assert.equal(getRotatingOverheadStatus(settings.statuses, 0), 'power');
  assert.equal(getRotatingOverheadStatus(settings.statuses, 0.99), 'power');
  assert.equal(getRotatingOverheadStatus(settings.statuses, 1), 'weight');
  assert.equal(getRotatingOverheadStatus(settings.statuses, 2), 'power');
  assert.deepEqual(normalizeOverheadStatusSettings({ statuses: 'power', visibility: 'unknown' }), DEFAULT_OVERHEAD_STATUS_SETTINGS);
});

test('overhead values use one entity rule for hero and enemy durability, weight, and scaled statuses', () => {
  const hero = { chip: { type: 'hero' }, stamina: 2.5, currentArea: 'preparation', getCarriedWeight: () => 14, getStatus: () => 1.23 };
  const enemy = { chip: { type: 'enemy' }, hp: 4.5, currentArea: 'battle', getCarriedWeight: () => 18, getStatus: () => 2.9 };
  assert.equal(getOverheadStatusValue(hero, 'power'), 1);
  assert.equal(getOverheadStatusValue(enemy, 'power'), 2);
  assert.equal(getOverheadStatusValue(hero, 'durability'), 250);
  assert.equal(getOverheadStatusValue(enemy, 'durability'), 450);
  assert.equal(getOverheadStatusValue(hero, 'weight'), 14);
  assert.equal(isOverheadStatusVisible(hero, OVERHEAD_STATUS_VISIBILITY.always), true);
  assert.equal(isOverheadStatusVisible(hero, OVERHEAD_STATUS_VISIBILITY.battle), false);
  assert.equal(isOverheadStatusVisible(enemy, OVERHEAD_STATUS_VISIBILITY.battle), true);
});
