import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_AREAS } from '../../src/game/GameAreas.js';
import { FACILITY_LAYOUT } from '../../src/game/FacilityLayout.js';
import { AREA_NAMEPLATE_GAP, getAreaNameplateAtPoint, getAreaNameplateBounds } from '../../src/game/AreaNameplateLayout.js';

test('home, warehouse, and battle labels share the facility plaque size without changing area bounds', () => {
  ['preparation', 'warehouse', 'battle'].forEach((areaName) => {
    const bounds = getAreaNameplateBounds(areaName);
    assert.equal(bounds.x, GAME_AREAS[areaName].x + FACILITY_LAYOUT.nameplateLeft);
    assert.equal(bounds.width, FACILITY_LAYOUT.nameplateWidth);
    assert.equal(bounds.height, FACILITY_LAYOUT.nameplateHeight);
  });
  assert.equal(AREA_NAMEPLATE_GAP, 16);
  assert.equal(getAreaNameplateBounds('preparation').y, GAME_AREAS.preparation.y - FACILITY_LAYOUT.nameplateHeight - AREA_NAMEPLATE_GAP);
  assert.equal(getAreaNameplateBounds('warehouse').y, GAME_AREAS.warehouse.y + FACILITY_LAYOUT.nameplateTop);
  assert.equal(getAreaNameplateBounds('battle').y, GAME_AREAS.battle.y + FACILITY_LAYOUT.nameplateTop);
});

test('area nameplate hit testing identifies every non-facility area label', () => {
  ['preparation', 'warehouse', 'battle'].forEach((areaName) => {
    const bounds = getAreaNameplateBounds(areaName);
    assert.equal(getAreaNameplateAtPoint({ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }), areaName);
  });
});
