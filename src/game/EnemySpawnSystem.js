export const ENEMY_SPAWN_SLOT_ORDER = Object.freeze([1, 6, 2, 5, 3, 4]);
export const ENEMY_SPAWN_INTERVAL_TICKS = 50;

export default class EnemySpawnSystem {
  constructor(controller, { intervalTicks = ENEMY_SPAWN_INTERVAL_TICKS } = {}) {
    this.controller = controller;
    this.intervalTicks = intervalTicks;
    this.pending = [];
  }

  schedule(enemies, { startTick = 0 } = {}) {
    this.pending = enemies.map((enemy) => {
      const order = ENEMY_SPAWN_SLOT_ORDER.indexOf(enemy.slotPosition);
      if (order < 0) throw new RangeError(`Unsupported enemy slot position: ${enemy.slotPosition}`);
      return { enemy, spawnTick: startTick + order * this.intervalTicks };
    }).toSorted((first, second) => first.spawnTick - second.spawnTick);
  }

  update(tick) {
    while (this.pending[0]?.spawnTick <= tick) {
      const { enemy } = this.pending.shift();
      enemy.chip.beginDrop();
      this.controller.add(enemy);
    }
  }
}
