import EnemyFactory from './EnemyFactory.js';
import { COMBINATION_PATTERNS, createEncounterEnemies } from './EncounterDefinitions.js';
import { TAGS } from './TagCatalog.js';
import { createStageRouteKinds } from './StageKindDistribution.js';
import { MAX_RECRUITED_HERO_COUNT } from './RecruitmentLimits.js';
import { getStageBaseLevel, rollStageLevel } from './StageLevel.js';

export { STAGE_LEVEL_OFFSET, STAGE_LEVEL_VARIATION, getStageBaseLevel, rollStageLevel } from './StageLevel.js';
export const STAGE_CHOICE_COUNT = 3;
const TAG_KEYS = Object.freeze(Object.keys(TAGS));

export default class StageController {
  constructor({ enemySpawn, battleSystem, enemyFactory = new EnemyFactory(), shopState = null, hasActiveShopHero = () => false, entityRegistry = null, random = Math.random, onStatistics = () => {}, now = () => new Date().toISOString() } = {}) {
    if (!enemySpawn || !battleSystem) throw new Error('Stage controller requires enemy spawning and battle systems.');
    Object.assign(this, { enemySpawn, battleSystem, enemyFactory, shopState, hasActiveShopHero, entityRegistry, random });
    this.onStatistics = onStatistics;
    this.now = now;
    this.stageNumber = 0;
    this.joinedCount = 0;
    this.state = 'idle';
    this.currentStage = null;
    this.choices = Object.freeze([]);
  }

  createStageChoices({ stageNumber = this.stageNumber + 1, choiceCount = STAGE_CHOICE_COUNT, joinedCount = this.joinedCount } = {}) {
    if (!['idle', 'complete'].includes(this.state)) throw new Error(`Cannot start a stage while state is ${this.state}.`);
    if (!Number.isInteger(choiceCount) || choiceCount < 1) throw new RangeError('Stage choice count must be at least one.');
    const routeKinds = createStageRouteKinds({ stageNumber, joinedCount, random: this.random });
    this.choices = Object.freeze(Array.from({ length: choiceCount }, (_, index) => {
      const { route, kind } = routeKinds[index % routeKinds.length];
      const level = rollStageLevel(stageNumber, this.random);
      const patterns = COMBINATION_PATTERNS[kind];
      const patternIndex = Math.floor(this.random() * patterns.length);
      const pattern = patterns[patternIndex];
      const enemies = createEncounterEnemies({ kind, level, pattern, enemyFactory: this.enemyFactory, random: this.random });
      enemies.forEach((enemy) => this.entityRegistry?.registerTree(enemy));
      return Object.freeze({
        id: `stage-${stageNumber}-choice-${index + 1}`,
        number: stageNumber,
        route,
        kind,
        patternIndex,
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

  setJoinedCount(joinedCount) {
    if (!Number.isInteger(joinedCount) || joinedCount < 0 || joinedCount > MAX_RECRUITED_HERO_COUNT) throw new RangeError(`Joined count must be an integer between zero and ${MAX_RECRUITED_HERO_COUNT}.`);
    this.joinedCount = joinedCount;
  }

  hasChoiceEnemy(enemy) {
    return this.state === 'selecting' && this.choices.some((choice) => choice.enemies.includes(enemy));
  }

  selectStage(choiceId, { tick = 0 } = {}) {
    if (this.state !== 'selecting') throw new Error(`Cannot select a stage while state is ${this.state}.`);
    const choice = this.choices.find(({ id }) => id === choiceId);
    if (!choice) throw new RangeError(`Unknown stage choice: ${choiceId}`);
    this.choices
      .filter((candidate) => candidate !== choice)
      .flatMap((candidate) => candidate.enemies)
      .forEach((enemy) => this.entityRegistry?.destroy(enemy, { includeRelated: true }));
    this.battleSystem.resetStageState();
    this.enemySpawn.schedule(choice.enemies, { startTick: tick });
    this.shopState?.applyRouteTrends(choice.shopTrends, { preserveCurrent: this.hasActiveShopHero(), random: this.random });
    this.stageNumber = choice.number;
    this.currentStage = Object.freeze({
      ...choice,
    });
    this.choices = Object.freeze([]);
    this.state = 'spawning';
    this.onStatistics({ type: 'stage-start', kind: choice.kind, patternIndex: choice.patternIndex, level: choice.level });
    return this.currentStage;
  }

  startStage({ stageNumber = this.stageNumber + 1, tick = 0 } = {}) {
    const [choice] = this.createStageChoices({ stageNumber, choiceCount: 1 });
    return this.selectStage(choice.id, { tick });
  }

  update() {
    if (!this.currentStage) return this.state;
    const previous = this.state;
    if (this.battleSystem.isStageComplete()) this.state = 'complete';
    else if (this.battleSystem.hasStageVictory()) this.state = 'victory';
    else if (this.battleSystem.battleStartTick !== null) this.state = 'battle';
    if (['victory', 'complete'].includes(this.state) && !['victory', 'complete'].includes(previous)) {
      const { kind, patternIndex, level } = this.currentStage;
      this.onStatistics({ type: 'stage-clear', kind, patternIndex, level, clearedAt: this.now() });
    }
    return this.state;
  }
}
