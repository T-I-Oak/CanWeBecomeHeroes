import test from 'node:test';
import assert from 'node:assert/strict';
import FacilitySwingSystem, { FACILITY_SWING_ANGULAR_FREQUENCY, getHeroSwingFrequency, HERO_STATE_SWING_ANGULAR_FREQUENCY } from '../../src/game/FacilitySwingSystem.js';

function hero(currentArea) {
  return { currentArea, chip: { tilt: 0, poseTilt: 0 } };
}

test('facility swing frequencies are training, shop, guild from fastest to slowest', () => {
  assert.ok(FACILITY_SWING_ANGULAR_FREQUENCY.training > FACILITY_SWING_ANGULAR_FREQUENCY.shop);
  assert.ok(FACILITY_SWING_ANGULAR_FREQUENCY.shop > FACILITY_SWING_ANGULAR_FREQUENCY.guild);
});

test('ready preparation heroes swing without using a color blink', () => {
  const readyHero = { currentArea: 'preparation', stamina: 3, chip: { tilt: 0, poseTilt: 0 } };
  assert.equal(getHeroSwingFrequency(readyHero, null), HERO_STATE_SWING_ANGULAR_FREQUENCY.preparationReady);
});

test('facility swing moves only the hero pose and preserves battle knockback tilt', () => {
  const system = new FacilitySwingSystem();
  const trainingHero = hero('training');
  trainingHero.chip.tilt = Math.PI / 2;
  system.update([trainingHero], 0.2);
  assert.ok(trainingHero.chip.poseTilt > 0);
  assert.equal(trainingHero.chip.tilt, Math.PI / 2);
});
