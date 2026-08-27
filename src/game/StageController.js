import EnemyFactory from './EnemyFactory.js';
import { COMBINATION_PATTERNS, createEncounterEnemies } from './EncounterDefinitions.js';
import { TAGS } from './TagCatalog.js';

export const STAGE_LEVEL_OFFSET = 2;
export const STAGE_LEVEL_VARIATION = 2;
export const STAGE_CHOICE_COUNT = 3;
export const REGULAR_STAGE_KIND = 'regular';

const TAG_KEYS = Object.freeze(Object.keys(TAGS));

export function getStageBaseLevel(stageNumber) {
  if (!Number.isInteger(stageNumber) || stageNumber < 1) throw new RangeError('Stage number must be a positive integer.');
  return stageNumber + STAGE_LEVEL_OFFSET;
}

export function rollStageLevel(stageNumber, random = Math.random) {
  const variation = Math.floor(random() * (STAGE_LEVEL_VARIATION * 2 + 1)) - STAGE_LEVEL_VARIATION;
  return Math.max(1, getStageBaseLevel(stageNumber) + variation);
}

export default class StageController {
  constructor({ enemySpawn, battleSystem, enemyFactory = new EnemyFactory(), shopState = null, hasActiveShopHero = () => false, random = Math.random } = {}) {
    if (!enemySpawn || !battleSystem) throw new Error('Stage controller requires enemy spawning and battle systems.');
    Object.assign(this, { enemySpawn, battleSystem, enemyFactory, shopState, hasActiveShopHero, random });
    this.stageNumber = 0;
    this.state = 'idle';
    this.currentStage = null;
    this.choices = Object.freeze([]);
  }

  createStageChoices({ stageNumber = this.stageNumber + 1, choiceCount = STAGE_CHOICE_COUNT } = {}) {
    if (!['idle', 'complete'].includes(this.state)) throw new Error(`Cannot start a stage while state is ${this.state}.`);
    if (!Number.isInteger(choiceCount) || choiceCount < 1) throw new RangeError('Stage choice count must be at least one.');
    const patterns = COMBINATION_PATTERNS[REGULAR_STAGE_KIND];
    this.choices = Object.freeze(Array.from({ length: choiceCount }, (_, index) => {
      const level = rollStageLevel(stageNumber, this.random);
      const pattern = patterns[Math.floor(this.random() * patterns.length)];
      const enemies = createEncounterEnemies({ kind: REGULAR_STAGE_KIND, level, pattern, enemyFactory: this.enemyFactory, random: this.random });
      return Object.freeze({
        id: `stage-${stageNumber}-choice-${index + 1}`,
        number: stageNumber,
        kind: REGULAR_STAGE_KIND,
        baseLevel: getStageBaseLevel(stageNumber),
        level,
        enemies: Object.freeze([...enemies]),
        shopTrends: Object.freeze({
          saleTag: TAG_KEYS[Math.floor(this.random() * TAG_KEYS.length)],
          nextTag: TAG_KEYS[Math.floor(this.random() * TAG_KEYS.length)],
        }),
      });
    }));
    this.state = 'selecting';
    return this.choices;
  }

  selectStage(choiceId, { tick = 0 } = {}) {
    if (this.state !== 'selecting') throw new Error(`Cannot select a stage while state is ${this.state}.`);
    const choice = this.choices.find(({ id }) => id === choiceId);
    if (!choice) throw new RangeError(`Unknown stage choice: ${choiceId}`);
    this.battleSystem.resetStageState();
    this.enemySpawn.schedule(choice.enemies, { startTick: tick });
    this.shopState?.applyRouteTrends(choice.shopTrends, { preserveCurrent: this.hasActiveShopHero(), random: this.random });
    this.stageNumber = choice.number;
    this.currentStage = Object.freeze({
      ...choice,
    });
    this.choices = Object.freeze([]);
    this.state = 'spawning';
    return this.currentStage;
  }

  startStage({ stageNumber = this.stageNumber + 1, tick = 0 } = {}) {
    const [choice] = this.createStageChoices({ stageNumber, choiceCount: 1 });
    return this.selectStage(choice.id, { tick });
  }

  update() {
    if (!this.currentStage) return this.state;
    if (this.battleSystem.isStageComplete()) this.state = 'complete';
    else if (this.battleSystem.hasStageVictory()) this.state = 'victory';
    else if (this.battleSystem.battleStartTick !== null) this.state = 'battle';
    return this.state;
  }
}
