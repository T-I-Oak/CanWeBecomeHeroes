import { logText, entityText } from './LocalizedLog.js';
import { logUniqueSkill, skillText, tagText } from './UniqueSkillLog.js';
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
import CombatStageLifecycle, { BATTLE_VICTORY_DELAY_TICKS } from './CombatStageLifecycle.js';
import CombatDamageReactionSystem from './CombatDamageReactionSystem.js';
import UniqueSkillEffectSystem from './UniqueSkillEffectSystem.js';
import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';
import CombatConditionSystem from './CombatConditionSystem.js';
import CombatKnockbackSystem from './CombatKnockbackSystem.js';
import CombatAttributeReactionSystem from './CombatAttributeReactionSystem.js';
import CombatGustSystem from './CombatGustSystem.js';

export { BATTLE_VICTORY_DELAY_TICKS };
export { WEAPON_ATTACKS, getAttackDamage, getRandomModifier };
export { getActionGaugeBaseMaximum, getActionGaugeMaximum };
export default class BattleSystem {
  constructor(board, { controller, itemFactory, enemyFactory = new EnemyFactory({ itemFactory }), uniqueSkillSystem = null, uniqueSkillEffectSystem = null, targetingSystem = null, attributeSystem = null, attributeReactionSystem = null, damageSystem = null, actionGaugeSystem = new CombatActionGaugeSystem(), weaponEffectSystem = null, actionLog = null, projectionSystem = null, defeatSystem = null, actionResolutionSystem = null, stageLifecycle = new CombatStageLifecycle(), damageReactionSystem = null, conditionSystem = new CombatConditionSystem(), knockbackSystem = new CombatKnockbackSystem(board), gustSystem = null, returnSystem, effects = null, gameLog = null, textRepository = null, random = Math.random, onDamage = null } = {}) {
    Object.assign(this, { board, controller, itemFactory, enemyFactory, returnSystem, effects, gameLog, textRepository, random, onDamage });
    this.uniqueSkillSystem = uniqueSkillSystem ?? new UniqueSkillSystem({ random });
    this.conditionSystem = conditionSystem;
    this.conditionSystem.effects = effects;
    this.knockbackSystem = knockbackSystem;
    this.gustSystem = gustSystem ?? new CombatGustSystem({
      board,
      controller,
      pickupController: controller?.pickupController,
      returnSystem,
      getWarehouseDropPosition: () => this.getWarehouseDropPosition(),
      clearCombatant: (combatant) => {
        this.conditionSystem.clearCombatant(combatant);
        this.effects?.clearNightFamiliars?.(combatant);
      },
    });
    this.uniqueSkillEffectSystem = uniqueSkillEffectSystem ?? new UniqueSkillEffectSystem({ board, controller, enemyFactory, uniqueSkillSystem: this.uniqueSkillSystem, random });
    this.attributeReactionSystem = attributeReactionSystem ?? new CombatAttributeReactionSystem({ uniqueSkillEffectSystem: this.uniqueSkillEffectSystem });
    this.targetingSystem = targetingSystem ?? new CombatTargetingSystem(board, {
      isTargetable: (combatant) => !this.knockbackSystem.isKnockedBack(combatant),
      isBewildered: (combatant) => this.conditionSystem.hasBewilderment(combatant),
    });
    this.actionGaugeSystem = actionGaugeSystem;
    this.actionLog = actionLog ?? new CombatActionLog({ gameLog, textRepository });
    this.projectionSystem = projectionSystem ?? new CombatProjectionSystem({ board, controller, actionGaugeSystem });
    this.attributeSystem = attributeSystem ?? new CombatAttributeSystem({
      board,
      effects,
      random,
      applyDamage: (...args) => this.applyDamage(...args),
      isTargetable: (combatant) => !this.knockbackSystem.isKnockedBack(combatant),
      resolveAttributeReactions: (attributeEvent) => this.attributeReactionSystem.resolve(attributeEvent),
      onAttributeReflected: (owner, recipient, attribute) => logUniqueSkill(this.gameLog, this.textRepository, 'logArcaneReflection', { actor: entityText(owner), skill: skillText({ id: 'arcane-reflection' }), attribute: tagText(attribute), target: entityText(recipient) }),
    });
    this.damageSystem = damageSystem ?? new CombatDamageSystem({
      random,
      effects,
      onDamage,
      recordDamage: (...args) => this.recordDamage(...args),
      recordMisfortune: (actor, damage) => this.actionLog.recordMisfortune(actor, damage),
      recordDefeat: (...args) => this.recordDefeat(...args),
      onHeroDepleted: (hero) => {
        this.knockbackSystem.cancel(hero);
        this.conditionSystem.clearCombatant(hero);
        this.effects?.clearNightFamiliars?.(hero);
        this.returnSystem?.begin(hero);
      },
      onDamageApplied: (damageEvent) => this.damageReactionSystem.resolve(damageEvent),
      onEnemyDefeated: (enemy) => this.defeatEnemy(enemy),
      onDamageResolved: (target) => this.uniqueSkillSystem.refreshBlessingSkills(target),
      conditionSystem: this.conditionSystem,
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
      uniqueSkillEffectSystem: this.uniqueSkillEffectSystem,
      projectionSystem: this.projectionSystem,
      getWarehouseDropPosition: () => this.getWarehouseDropPosition(),
      random,
      gameLog,
      textRepository,
    });
    this.damageReactionSystem = damageReactionSystem ?? new CombatDamageReactionSystem({
      controller,
      itemFactory,
      uniqueSkillEffectSystem: this.uniqueSkillEffectSystem,
      attributeSystem: this.attributeSystem,
      actionGaugeSystem,
      getWarehouseDropPosition: () => this.getWarehouseDropPosition(),
      knockbackSystem: this.knockbackSystem,
      conditionSystem: this.conditionSystem,
      effects,
      gameLog,
      textRepository,
    });
    this.actionResolutionSystem = actionResolutionSystem ?? new CombatActionResolutionSystem({
      board,
      targetingSystem: this.targetingSystem,
      attributeSystem: this.attributeSystem,
      weaponEffectSystem: this.weaponEffectSystem,
      damageSystem: this.damageSystem,
      actionGaugeSystem,
      actionLog: this.actionLog,
      projectionSystem: this.projectionSystem,
      uniqueSkillSystem: this.uniqueSkillSystem,
      uniqueSkillEffectSystem: this.uniqueSkillEffectSystem,
      conditionSystem: this.conditionSystem,
      knockbackSystem: this.knockbackSystem,
      gustSystem: this.gustSystem,
      effects,
      gameLog,
      textRepository,
      random,
    });
    this.stageLifecycle = stageLifecycle;
    this.contributionPoints = 0;
  }
  get battleStartTick() { return this.stageLifecycle.battleStartTick; }
  set battleStartTick(value) { this.stageLifecycle.battleStartTick = value; }
  get defeatTick() { return this.stageLifecycle.defeatTick; }
  set defeatTick(value) { this.stageLifecycle.defeatTick = value; }
  get victoryTick() { return this.stageLifecycle.victoryTick; }
  set victoryTick(value) { this.stageLifecycle.victoryTick = value; }
  get stageCompleteTick() { return this.stageLifecycle.stageCompleteTick; }
  set stageCompleteTick(value) { this.stageLifecycle.stageCompleteTick = value; }
  get phantomHeads() { return this.projectionSystem.areaHeads; }
  resetStageState() {
    this.projectionSystem.clearAreaHeads();
    this.stageLifecycle.reset();
    this.attributeSystem.reset();
    this.uniqueSkillSystem.reset?.();
    this.conditionSystem.reset();
    this.effects?.clearNightFamiliars?.();
  }
  hasStageVictory() { return this.stageLifecycle.hasVictory(); }
  isStageComplete() { return this.stageLifecycle.isComplete(); }
  update({ heroes, enemies, tick, tickDelta }) {
    this.gustSystem.update();
    this.knockbackSystem.update();
    [...heroes, ...enemies].filter((a) => a.currentArea !== 'battle' || a.targetArea).forEach((a) => {
      a.clearBattleState?.();
      this.conditionSystem.clearCombatant(a);
    });
    const stageEnemies = this.controller?.getEnemies?.() ?? enemies;
    const activeEnemies = [...new Set([...stageEnemies.filter((e) => isEntityOnBoard(this.board, e)), ...this.projectionSystem.areaHeads.filter((e) => isEntityOnBoard(this.board, e))])];
    this.stageLifecycle.markEnemyEncountered(activeEnemies);
    if (!this.stageLifecycle.startWhenReady(activeEnemies, tick)) return;
    if (this.hasStageVictory()) {
      this.projectionSystem.clearAreaHeads();
      this.stageLifecycle.updateVictoryDelay(tickDelta, tick);
      heroes.forEach((h) => this.returnSystem?.update(h));
      return;
    }
    const effectRecipients = [...heroes.filter((h) => h.currentArea === 'battle' && !h.targetArea && isEntityOnBoard(this.board, h)), ...activeEnemies];
    this.attributeSystem.update(effectRecipients, tickDelta);
    const participants = effectRecipients.filter((combatant) => !this.knockbackSystem.isKnockedBack(combatant)
      && combatant.currentArea === 'battle' && !combatant.targetArea && combatant.chip.isSettled);
    participants.forEach((participant) => this.uniqueSkillSystem.initialize(participant));
    participants.forEach((a) => this.updateActor(a, participants, tickDelta));
    const remainingEnemies = this.controller?.getEnemies?.() ?? stageEnemies;
    if (remainingEnemies.every((enemy) => !isEntityOnBoard(this.board, enemy)) && this.stageLifecycle.markVictory(tick)) {
      logText(this.gameLog, this.textRepository, 'logVictory', {}, { subject: 'system', level: 'info', channel: 'event' });
    }
    heroes.forEach((h) => this.returnSystem?.update(h));
  }
  updateAttributes(participants, delta) { this.attributeSystem.update(participants, delta); }
  updateActor(actor, participants, delta) {
    if (this.gustSystem.isGusting(actor)) return;
    if (!this.actionGaugeSystem.advance(actor, delta)) return;
    const target = this.findTarget(actor, participants);
    if (target) this.actionResolutionSystem.resolve(actor, target, participants);
    else if (actor.isPhantomHead) this.projectionSystem.returnAreaHead(actor);
    else {
      this.actionResolutionSystem.resolveBewildermentContinuation(actor);
      this.conditionSystem.clearMisfortune(actor);
      this.uniqueSkillSystem.refreshBlessingSkills(actor);
    }
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
  resolveDamageUniqueSkill(enemy) { return this.damageReactionSystem.resolve({ target: enemy }); }
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
  defeatEnemy(enemy) {
    this.knockbackSystem.cancel(enemy);
    this.conditionSystem.clearCombatant(enemy);
    this.effects?.clearNightFamiliars?.(enemy);
    this.contributionPoints += this.defeatSystem.resolve(enemy);
  }
}
export { ACTION_GAUGE_BASE_RATE, ACTION_GAUGE_WEIGHT_SCALE, BOW_GAUGE_SHORTENING_PER_WEAPON, MAX_BOW_GAUGE_SHORTENING_WEAPONS };
