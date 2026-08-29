import test from 'node:test';
import assert from 'node:assert/strict';
import { AREA_DETAILS, getAreaDetail } from '../../src/game/AreaDetailCatalog.js';

test('area detail catalog describes every non-facility named area', () => {
  ['preparation', 'warehouse', 'battle'].forEach((area) => {
    const detail = getAreaDetail(area);
    assert.equal(detail, AREA_DETAILS[area]);
    assert.ok(detail.name.length > 0);
    assert.ok(detail.description.length > 0);
  });
});
