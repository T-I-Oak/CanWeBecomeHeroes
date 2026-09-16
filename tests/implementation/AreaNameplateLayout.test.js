import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_AREAS } from '../../src/game/GameAreas.js';
import { AREA_NAMEPLATE_GAP, getAreaNameplateOrigin } from '../../src/game/AreaNameplateLayout.js';
import { LOCATION_NAMEPLATE_LAYOUT } from '../../src/game/LocationNameplateLayout.js';

test('home, warehouse, and battle labels share location nameplate origins without changing area bounds', () => {
  ['preparation', 'warehouse', 'battle'].forEach((areaName) => {
    const origin = getAreaNameplateOrigin(areaName);
    assert.equal(origin.x, GAME_AREAS[areaName].x + LOCATION_NAMEPLATE_LAYOUT.left);
  });
  assert.equal(AREA_NAMEPLATE_GAP, 16);
  assert.equal(getAreaNameplateOrigin('preparation').y, GAME_AREAS.preparation.y - LOCATION_NAMEPLATE_LAYOUT.height - AREA_NAMEPLATE_GAP);
  assert.equal(getAreaNameplateOrigin('warehouse').y, GAME_AREAS.warehouse.y + LOCATION_NAMEPLATE_LAYOUT.top);
  assert.equal(getAreaNameplateOrigin('battle').y, GAME_AREAS.battle.y + LOCATION_NAMEPLATE_LAYOUT.top);
});
