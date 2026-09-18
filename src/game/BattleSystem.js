import { logText, entityText } from './LocalizedLog.js';
import { GAME_AREAS } from './GameAreas.js';
import EnemyFactory from './EnemyFactory.js';
import UniqueSkillSystem from './UniqueSkillSystem.js';
import CombatTargetingSystem from './CombatTargetingSystem.js';
import CombatAttributeSystem from './CombatAttributeSystem.js';
import CombatDamageSystem from './CombatDamageSystem.js';
import CombatActionGaugeSystem, {
  ACTION_GAUGE_BASE_RATE,
  ACTION_GAUGE_WEIGHT_SCALE,
  BOW_GAUGE_SHORTENING_PER_WEAPON,
  getActionGaugeBaseMaximum,
  getActionGaugeMaximum,
  MAX_BOW_GAUGE_SHORTENING_WEAPONS,
} from './CombatActionGaugeSystem.js';
import CombatWeaponEffectSystem from './CombatWeaponEffectSystem.js';
import CombatActionLog from './CombatActionLog.js';
import CombatProjectionSystem from './CombatProjectionSystem.js';
import CombatEnemyDefeatSystem from './CombatEnemyDefeatSystem.js';
import CombatActionResolutionSystem from './CombatActionResolutionSystem.js';
import { WEAPON_ATTACKS, getAttackDamage, getRandomModifier } from './CombatWeaponAttack.js';
import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';

export const BATTLE_VICTORY_DELAY_TICKS = 200;
export { WEAPON_ATTACKS, getAttackDamage, getRandomModifier };
export { getActionGaugeBaseMaximum, getActionGaugeMaximum };
export default class BattleSystem {
  constructor(board, { controller, itemFactory, enemyFactory = new EnemyFactory({ itemFactory }), uniqueSkillSystem = null, targetingSystem = null, attributeSystem = null, damageSystem = null, actionGaugeSystem = new CombatActionGaugeSystem(), weaponEffectSystem = null, actionLog = null, projectionSystem = null, defeatSystem = null, actionResolutionSystem = null, returnSystem, effects = null, gameLog = null, textRepository = null, random = Math.random, onDamage = null } = {}) {
    Object.assign(this, { board, controller, itemFactory, enemyFactory, returnSystem, effects, gameLog, textRepository, random, onDamage });
    this.uniqueSkillSystem = uniqueSkillSystem ?? new UniqueSkillSystem({ board, controller, enemyFactory, random });
    this.targetingSystem = targetingSystem ?? new CombatTargetingSystem(board);
    this.actionGaugeSystem = actionGaugeSystem;
    this.actionLog = actionLog ?? new CombatActionLog({ gameLog, textRepository });
    this.projectionSystem = projectionSystem ?? new CombatProjectionSystem({ board, controller, actionGaugeSystem });
    this.attributeSystem = attributeSystem ?? new CombatAttributeSystem({ board, effects, random, applyDamage: (...args) => this.applyDamage(...args) });
    this.damageSystem = damageSystem ?? new CombatDamageSystem({
      random,
      effects,
      onDamage,
      recordDamage: (...args) => this.recordDamage(...args),
      recordDefeat: (...args) => this.recordDefeat(...args),
      onHeroDepleted: (hero) => this.returnSystem?.begin(hero),
      onEnemyDamaged: (enemy) => this.resolveDamageUniqueSkill(enemy),
      onEnemyDefeated: (enemy) => this.defeatEnemy(enemy),
      onDamageResolved: (target) => this.uniqueSkillSystem.refreshBlessingSkills(target),
    });
    this.weaponEffectSystem = weaponEffectSystem ?? new CombatWeaponEffectSystem({
      board,
      controller,
      damageSystem: this.damageSystem,
      effects,
      getWarehouseDropPosition: () => this.getWarehouseDropPosition(),
      random,
      actionGaugeSystem,
    });
    this.defeatSystem = defeatSystem ?? new CombatEnemyDefeatSystem({
      board,
      controller,
      itemFactory,
      uniqueSkillSystem: this.uniqueSkillSystem,
      projectionSystem: this.projectionSystem,
      getWarehouseDropPosition: () => this.getWarehouseDropPosition(),
      random,
      gameLog,
      textRepository,
    });
    this.actionResolutionSystem = actionResolutionSystem ?? new CombatActionResolutionSystem({
      board,
      targetingSystem: this.targetingSystem,
      attributeSystem: this.attributeSystem,
      weaponEffectSystem: this.weaponEffectSystem,
      damageSystem: this.damageSystem,
      actionLog: this.actionLog,
      projectionSystem: this.projectionSystem,
      uniqueSkillSystem: this.uniqueSkillSystem,
      effects,
      gameLog,
      textRepository,
      random,
    });
    this.contributionPoints = 0; this.battleStartTick = null; this.defeatTick = null; this.victoryTick = null; this.stageCompleteTick = null; this.victoryDelayTicks = 0; this.hasEncounteredEnemy = false;
  }
  get phantomHeads() { return this.projectionSystem.areaHeads; }
  resetStageState() {
    this.projectionSystem.clearAreaHeads();
    this.battleStartTick = null;
    this.defeatTick = null;
    this.victoryTick = null;
    this.stageCompleteTick = null;
    this.victoryDelayTicks = 0;
    this.hasEncounteredEnemy = false;
    this.attributeSystem.reset();
    this.uniqueSkillSystem.reset?.();
  }
  hasStageVictory() { return this.victoryTick !== null; }
  isStageComplete() { return this.stageCompleteTick !== null; }
  update({ heroes, enemies, tick, tickDelta }) {
    [...heroes, ...enemies].filter((a) => a.currentArea !== 'battle' || a.targetArea).forEach((a) => a.clearBattleState?.());
    const stageEnemies = this.controller?.getEnemies?.() ?? enemies;
    const activeEnemies = [...new Set([...stageEnemies.filter((e) => isEntityOnBoard(this.board, e)), ...this.projectionSystem.areaHeads.filter((e) => isEntityOnBoard(this.board, e))])];
    if (activeEnemies.length > 0) this.hasEncounteredEnemy = true;
    if (this.battleStartTick === null && activeEnemies.some((e) => e.chip.isSettled)) this.battleStartTick = tick;
    if (this.battleStartTick === null) return;
    if (this.hasStageVictory()) {
      this.projectionSystem.clearAreaHeads();
      this.updateVictoryDelay(tickDelta, tick);
      heroes.forEach((h) => this.returnSystem?.update(h));
      return;
    }
    const participants = [...heroes.filter((h) => h.currentArea === 'battle' && !h.targetArea && isEntityOnBoard(this.board, h) && h.chip.isSettled), ...activeEnemies.filter((e) => e.chip.isSettled)];
    participants.forEach((participant) => this.uniqueSkillSystem.initialize(participant));
    this.attributeSystem.update(participants, tickDelta);
    participants.forEach((a) => this.updateActor(a, participants, tickDelta));
    const remainingEnemies = this.controller?.getEnemies?.() ?? stageEnemies;
    if (this.hasEncounteredEnemy && remainingEnemies.every((e) => !isEntityOnBoard(this.board, e)) && this.defeatTick === null) {
      this.defeatTick = tick;
      this.victoryTick = tick;
      logText(this.gameLog, this.textRepository, 'logVictory', {}, { subject: 'system', level: 'info', channel: 'event' });
    }
    heroes.forEach((h) => this.returnSystem?.update(h));
  }
  updateVictoryDelay(delta, tick) {
    if (this.stageCompleteTick !== null) return;
    this.victoryDelayTicks += delta;
    if (this.victoryDelayTicks >= BATTLE_VICTORY_DELAY_TICKS) this.stageCompleteTick = tick;
  }
  updateAttributes(participants, delta) { this.attributeSystem.update(participants, delta); }
  updateActor(actor, participants, delta) {
    if (!this.actionGaugeSystem.advance(actor, delta)) return;
    const target = this.findTarget(actor, participants);
    if (target) this.actionResolutionSystem.resolve(actor, target, participants);
    else if (actor.isPhantomHead) this.projectionSystem.returnAreaHead(actor);
    else this.uniqueSkillSystem.refreshBlessingSkills(actor);
  }
  updateActionGaugeMaximum(actor) { return this.actionGaugeSystem.updateMaximum(actor); }
  findTarget(actor, participants) { return this.targetingSystem.findTarget(actor, participants); }
  rangeTargets(actor, target, participants) { return this.targetingSystem.rangeTargets(actor, target, participants); }
  createRangeLane(actor, foes) { return this.targetingSystem.createRangeLane(actor, foes); }
  isAttackMiss(actor, target) { return this.actionResolutionSystem.isAttackMiss(actor, target); }
  applyAttributes(actor, target, coefficient) { this.attributeSystem.applyAttributes(actor, target, coefficient); }
  resolveAction(actor, target, participants, options) { return this.actionResolutionSystem.resolve(actor, target, participants, options); }
  attackTypes(actor) { return this.actionResolutionSystem.attackTypes(actor); }
  resolveVitality(actor) { return this.actionResolutionSystem.resolveVitality(actor); }
  resolveWeapon(actor, target, type, participants) { return this.actionResolutionSystem.resolveWeapon(actor, target, type, participants); }
  applyShield(actor, participants) { this.weaponEffectSystem.applyShield(actor, participants); }
  applyHolyBook(actor, participants) { this.weaponEffectSystem.applyHolyBook(actor, participants); }
  applyBanner(actor, participants) { this.weaponEffectSystem.applyBanner(actor, participants); }
  applyHolySymbol(actor, participants) { this.weaponEffectSystem.applyHolySymbol(actor, participants); }
  applyTarotCards(actor, participants) { this.weaponEffectSystem.applyTarotCards(actor, participants); }
  applyPhysicalDamage(actor, target, type, damage, critical, participants) {
    return this.damageSystem.applyPhysicalDamage(actor, target, type, damage, critical, participants, {
      propagate: (...args) => this.propagate(...args),
    });
  }
  setPhysicalDamageReduction(target, value) { this.damageSystem.setPhysicalDamageReduction(target, value); }
  applyOrb(actor, target, coefficient) { this.weaponEffectSystem.applyOrb(actor, target, coefficient); }
  getTheftCandidates(target) { return this.weaponEffectSystem.getTheftCandidates(target); }
  resolveTheft(actor, target) { return this.weaponEffectSystem.resolveTheft(actor, target); }
  transferStolenItem(actor, target, item) { this.weaponEffectSystem.transferStolenItem(actor, target, item); }
  getLightningTargets(target, participants, value) { return this.attributeSystem.getLightningTargets(target, participants, value); }
  propagate(actor, target, type, damage, participants) { this.attributeSystem.propagate(actor, target, type, damage, participants); }
  applyDamage(actor, target, type, damage, critical = false) { return this.damageSystem.applyDamage(actor, target, type, damage, critical); }
  resolveDamageUniqueSkill(enemy) {
    const { skill, drops } = this.uniqueSkillSystem.resolveOnDamaged?.(enemy) ?? { skill: null, drops: [] };
    if (drops.length === 0) return;
    drops.forEach((drop) => {
      const position = this.getWarehouseDropPosition();
      const item = this.itemFactory.createWeapon({ weapon: drop.weapon, tags: drop.tags, x: position.x, y: position.y });
      this.controller?.addToWarehouse?.(item);
    });
    logText(this.gameLog, this.textRepository, 'logOrb', { actor: entityText(enemy), skill: { kind: 'unique-skill', id: skill.id }, count: drops.length }, { subject: 'enemy', level: 'info', channel: 'battle' });
  }
  resolveActionUniqueSkill(enemy, participants = []) { return this.actionResolutionSystem.resolveActionUniqueSkill(enemy, participants); }
  recordMiss(actor, target) { this.actionLog.recordMiss(actor, target); }
  recordDamage(actor, target, damage, critical) { this.actionLog.recordDamage(actor, target, damage, critical); }
  recordDefeat(actor, target) { this.actionLog.recordDefeat(actor, target); }
  getEntityLabel(entity) { return isHeroCombatant(entity) ? `【${this.textRepository?.getHeroLabel(entity) ?? entity.heroId}】` : `【${this.textRepository?.getName('enemy', entity.definition.id) ?? entity.definition.id}】`; }
  getWarehouseDropPosition() {
    const area = GAME_AREAS.warehouse;
    const margin = 64;
    return {
      x: area.x + margin + this.random() * (area.width - margin * 2),
      y: area.y + margin + this.random() * (area.height - margin * 2),
    };
  }
  createEnemyDrops(enemy) { return this.defeatSystem.createEnemyDrops(enemy); }
  defeatEnemy(enemy) { this.contributionPoints += this.defeatSystem.resolve(enemy); }
  getElapsedTicks(tick) { return this.battleStartTick === null ? null : Math.max(0, Math.round((this.defeatTick ?? tick) - this.battleStartTick)); }
}
export { ACTION_GAUGE_BASE_RATE, ACTION_GAUGE_WEIGHT_SCALE, BOW_GAUGE_SHORTENING_PER_WEAPON, MAX_BOW_GAUGE_SHORTENING_WEAPONS };
