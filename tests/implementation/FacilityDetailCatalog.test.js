import test from 'node:test';
import assert from 'node:assert/strict';
import { getFacilityDetail } from '../../src/game/FacilityDetailCatalog.js';

test('facility detail catalog describes every named facility', () => {
  ['shop', 'guild', 'training'].forEach((facility) => {
    const detail = getFacilityDetail(facility);
    assert.ok(detail.name);
    assert.ok(detail.description);
  });
});
