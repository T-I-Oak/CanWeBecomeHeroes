import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_AREAS } from '../../src/game/GameAreas.js';
import { FACILITY_LAYOUT, getFacilityNameplateOrigin, getFacilitySlotOrigin } from '../../src/game/FacilityLayout.js';
import { LOCATION_NAMEPLATE_LAYOUT } from '../../src/game/LocationNameplateLayout.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';

test('facility hero slots share a 24px left alignment and named facilities leave room for the nameplate', () => {
  ['shop', 'guild', 'training'].forEach((areaName) => {
    const origin = getFacilitySlotOrigin(areaName);
    assert.equal(origin.x, GAME_AREAS[areaName].x + FACILITY_LAYOUT.slotLeft);
  });
  ['shop', 'guild', 'training'].forEach((areaName) => {
    assert.equal(getFacilitySlotOrigin(areaName).y, GAME_AREAS[areaName].y + FACILITY_LAYOUT.heroSlotTop);
  });
});

test('facility nameplates use one shared origin for the icon and facility name', () => {
  const origin = getFacilityNameplateOrigin('guild');
  assert.deepEqual(origin, {
    x: GAME_AREAS.guild.x + LOCATION_NAMEPLATE_LAYOUT.left,
    y: GAME_AREAS.guild.y + LOCATION_NAMEPLATE_LAYOUT.top,
  });
});

test('facility slot manager targets use the same origins as the rendered slots', () => {
  const manager = new HeroSlotManager();
  const guildSlot = manager.getSlot('guild-1');
  const origin = getFacilitySlotOrigin('guild');
  assert.equal(guildSlot.x, origin.x + 112);
  assert.equal(guildSlot.y, origin.y + 112);
});
