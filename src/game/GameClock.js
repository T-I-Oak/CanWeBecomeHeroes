export const GAME_TICKS_PER_SECOND = 60;
export const GAME_TICK_SECONDS = 1 / GAME_TICKS_PER_SECOND;

const MAX_WALL_DELTA_SECONDS = 0.05;
const MAX_SIMULATION_STEP_SECONDS = GAME_TICK_SECONDS;
export default class GameClock {
  constructor({ speed = 1, paused = false } = {}) {
    this.speed = speed;
    this.paused = paused;
    this.pauseReasons = new Set();
    this.tick = 0;
  }

  get isPaused() {
    return this.paused || this.pauseReasons.size > 0;
  }

  setSpeed(speed) {
    if (!Number.isFinite(speed) || speed <= 0) throw new RangeError(`Game speed must be a positive finite number: ${speed}`);
    this.speed = speed;
  }

  togglePaused() {
    this.paused = !this.paused;
    return this.paused;
  }

  pause(reason) {
    this.pauseReasons.add(reason);
  }

  resume(reason) {
    this.pauseReasons.delete(reason);
  }

  reset() {
    this.tick = 0;
    this.paused = false;
    this.pauseReasons.clear();
  }

  advance(wallDeltaSeconds, update) {
    if (this.isPaused) return 0;
    let remaining = Math.min(MAX_WALL_DELTA_SECONDS, Math.max(0, wallDeltaSeconds)) * this.speed;
    let steps = 0;
    while (remaining > 0.000000001) {
      const deltaSeconds = Math.min(MAX_SIMULATION_STEP_SECONDS, remaining);
      const tickDelta = deltaSeconds * GAME_TICKS_PER_SECOND;
      this.tick += tickDelta;
      update(deltaSeconds, tickDelta);
      if (this.isPaused) break;
      remaining = Math.max(0, remaining - deltaSeconds);
      steps += 1;
    }
    return steps;
  }
}
