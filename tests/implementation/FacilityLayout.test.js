import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_AREAS } from '../../src/game/GameAreas.js';
import { FACILITY_LAYOUT, getFacilityNameplateBounds, getFacilitySlotOrigin } from '../../src/game/FacilityLayout.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';

test('facility hero slots share a 24px left alignment and named facilities leave room for the plaque', () => {
  ['shop', 'guild', 'training'].forEach((areaName) => {
    const origin = getFacilitySlotOrigin(areaName);
    assert.equal(origin.x, GAME_AREAS[areaName].x + FACILITY_LAYOUT.slotLeft);
  });
  assert.equal(getFacilitySlotOrigin('shop').y, GAME_AREAS.shop.y + FACILITY_LAYOUT.shopSlotTop);
  assert.equal(getFacilitySlotOrigin('guild').y, GAME_AREAS.guild.y + FACILITY_LAYOUT.namedSlotTop);
  assert.equal(getFacilitySlotOrigin('training').y, GAME_AREAS.training.y + FACILITY_LAYOUT.namedSlotTop);
});

test('facility nameplates use the shared 3:1 bounds at the upper left', () => {
  const plaque = getFacilityNameplateBounds('guild');
  assert.deepEqual(plaque, {
    x: GAME_AREAS.guild.x + 24,
    y: GAME_AREAS.guild.y + 16,
    width: 144,
    height: 48,
  });
});

test('facility slot manager targets use the same origins as the rendered slots', () => {
  const manager = new HeroSlotManager();
  const guildSlot = manager.getSlot('guild-1');
  const origin = getFacilitySlotOrigin('guild');
  assert.equal(guildSlot.x, origin.x + 112);
  assert.equal(guildSlot.y, origin.y + 112);
});
