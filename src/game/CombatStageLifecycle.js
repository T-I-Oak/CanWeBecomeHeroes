export const BATTLE_VICTORY_DELAY_TICKS = 200;

export default class CombatStageLifecycle {
  constructor() { this.reset(); }

  reset() {
    this.battleStartTick = null;
    this.defeatTick = null;
    this.victoryTick = null;
    this.stageCompleteTick = null;
    this.victoryDelayTicks = 0;
    this.hasEncounteredEnemy = false;
  }

  markEnemyEncountered(activeEnemies) {
    if (activeEnemies.length > 0) this.hasEncounteredEnemy = true;
  }

  startWhenReady(activeEnemies, tick) {
    if (this.battleStartTick === null && activeEnemies.some((enemy) => enemy.chip.isSettled)) this.battleStartTick = tick;
    return this.battleStartTick !== null;
  }

  hasVictory() { return this.victoryTick !== null; }

  isComplete() { return this.stageCompleteTick !== null; }

  markVictory(tick) {
    if (!this.hasEncounteredEnemy || this.defeatTick !== null) return false;
    this.defeatTick = tick;
    this.victoryTick = tick;
    return true;
  }

  updateVictoryDelay(delta, tick) {
    if (this.stageCompleteTick !== null) return;
    this.victoryDelayTicks += delta;
    if (this.victoryDelayTicks >= BATTLE_VICTORY_DELAY_TICKS) this.stageCompleteTick = tick;
  }

  getElapsedTicks(tick) {
    return this.battleStartTick === null ? null : Math.max(0, Math.round((this.defeatTick ?? tick) - this.battleStartTick));
  }
}
