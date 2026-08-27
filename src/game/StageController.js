import EnemyFactory from './EnemyFactory.js';
import { COMBINATION_PATTERNS, createEncounterEnemies } from './EncounterDefinitions.js';

export const STAGE_LEVEL_OFFSET = 2;
export const STAGE_LEVEL_VARIATION = 2;

export function getStageBaseLevel(stageNumber) {
  if (!Number.isInteger(stageNumber) || stageNumber < 1) throw new RangeError('Stage number must be a positive integer.');
  return stageNumber + STAGE_LEVEL_OFFSET;
}

export function rollStageLevel(stageNumber, random = Math.random) {
  const variation = Math.floor(random() * (STAGE_LEVEL_VARIATION * 2 + 1)) - STAGE_LEVEL_VARIATION;
  return Math.max(1, getStageBaseLevel(stageNumber) + variation);
}

export default class StageController {
  constructor({ enemySpawn, battleSystem, enemyFactory = new EnemyFactory(), random = Math.random } = {}) {
    if (!enemySpawn || !battleSystem) throw new Error('Stage controller requires enemy spawning and battle systems.');
    Object.assign(this, { enemySpawn, battleSystem, enemyFactory, random });
    this.stageNumber = 0;
    this.state = 'idle';
    this.currentStage = null;
  }

  startNormalStage({ stageNumber = this.stageNumber + 1, tick = 0 } = {}) {
    if (!['idle', 'complete'].includes(this.state)) throw new Error(`Cannot start a stage while state is ${this.state}.`);
    const level = rollStageLevel(stageNumber, this.random);
    const patterns = COMBINATION_PATTERNS.normal;
    const pattern = patterns[Math.floor(this.random() * patterns.length)];
    const enemies = createEncounterEnemies({ kind: 'normal', level, pattern, enemyFactory: this.enemyFactory, random: this.random });
    this.battleSystem.resetStageState();
    this.enemySpawn.schedule(enemies, { startTick: tick });
    this.stageNumber = stageNumber;
    this.currentStage = Object.freeze({
      number: stageNumber,
      kind: 'normal',
      baseLevel: getStageBaseLevel(stageNumber),
      level,
      enemies: Object.freeze([...enemies]),
    });
    this.state = 'spawning';
    return this.currentStage;
  }

  update() {
    if (!this.currentStage) return this.state;
    if (this.battleSystem.isStageComplete()) this.state = 'complete';
    else if (this.battleSystem.hasStageVictory()) this.state = 'victory';
    else if (this.battleSystem.battleStartTick !== null) this.state = 'battle';
    return this.state;
  }
}
