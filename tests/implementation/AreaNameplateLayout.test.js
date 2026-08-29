import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_AREAS } from '../../src/game/GameAreas.js';
import { FACILITY_LAYOUT } from '../../src/game/FacilityLayout.js';
import { getAreaNameplateBounds } from '../../src/game/AreaNameplateLayout.js';

test('home, warehouse, and battle labels share the facility plaque size without changing area bounds', () => {
  ['preparation', 'warehouse', 'battle'].forEach((areaName) => {
    const bounds = getAreaNameplateBounds(areaName);
    assert.equal(bounds.x, GAME_AREAS[areaName].x + FACILITY_LAYOUT.nameplateLeft);
    assert.equal(bounds.width, FACILITY_LAYOUT.nameplateWidth);
    assert.equal(bounds.height, FACILITY_LAYOUT.nameplateHeight);
  });
  assert.equal(getAreaNameplateBounds('preparation').y, GAME_AREAS.preparation.y - FACILITY_LAYOUT.nameplateHeight);
  assert.equal(getAreaNameplateBounds('warehouse').y, GAME_AREAS.warehouse.y + FACILITY_LAYOUT.nameplateTop);
  assert.equal(getAreaNameplateBounds('battle').y, GAME_AREAS.battle.y + FACILITY_LAYOUT.nameplateTop);
});
