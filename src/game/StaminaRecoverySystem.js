const GAME_TICK_SECONDS = 1 / 60;
const STAMINA_PER_TICK = 0.005;

export default class StaminaRecoverySystem {
  constructor() {
    this.elapsed = 0;
  }

  update(heroes, deltaSeconds) {
    this.elapsed += deltaSeconds;
    while (this.elapsed >= GAME_TICK_SECONDS) {
      this.elapsed -= GAME_TICK_SECONDS;
      heroes.forEach((hero) => {
        if (hero.currentArea !== 'preparation') return;
        hero.stamina = Math.min(hero.maximums.stamina, hero.stamina + STAMINA_PER_TICK);
      });
    }
  }
}

export { GAME_TICK_SECONDS, STAMINA_PER_TICK };
