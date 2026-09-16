export const HERO_SWING_ANGLE_RADIANS = Math.PI / 18;
const FOLLOW_RATE = 8;

export const FACILITY_SWING_ANGULAR_FREQUENCY = Object.freeze({
  training: 4,
  shop: 2.4,
  guild: 1.5,
});
export const HERO_STATE_SWING_ANGULAR_FREQUENCY = Object.freeze({ preparationReady: 1.2, active: 6 });

export function getHeroSwingPoseTilt(timeSeconds, frequency) {
  return frequency ? Math.sin(timeSeconds * frequency) * HERO_SWING_ANGLE_RADIANS : 0;
}

export function getHeroSwingFrequency(hero) {
  if (hero.currentArea === 'preparation' && hero.stamina >= 3) return HERO_STATE_SWING_ANGULAR_FREQUENCY.preparationReady;
  return FACILITY_SWING_ANGULAR_FREQUENCY[hero.currentArea] ?? 0;
}

export default class FacilitySwingSystem {
  constructor() {
    this.time = 0;
  }

  update(heroes, deltaSeconds, activeHero = null) {
    this.time += deltaSeconds;
    const followRatio = 1 - Math.exp(-FOLLOW_RATE * deltaSeconds);
    heroes.forEach((hero) => {
      const frequency = getHeroSwingFrequency(hero, activeHero);
      const targetTilt = getHeroSwingPoseTilt(this.time, frequency);
      // Pose motion is independent from battle knockback tilt.  Following the
      // combined rotation here would visually cancel a hit as soon as this
      // idle animation updates.
      hero.chip.poseTilt += (targetTilt - hero.chip.poseTilt) * followRatio;
    });
  }
}
