import { logText, entityText } from './LocalizedLog.js';
import { GAME_AREAS } from './GameAreas.js';
import { createTrendEquipmentSet } from './TrendEquipmentGenerator.js';
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
import { getCombatRandomModifier } from './CombatRandom.js';
import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';

export const WEAPON_ATTACKS = Object.freeze({ sword: ['power', 1], shield: ['power', 1 / 8], claw: ['power', 1 / 8], bow: ['power', 1 / 2], banner: ['magic', 1 / 8], staff: ['magic', 1], 'holy-book': ['magic', 1 / 4], orb: ['power', 1 / 8], 'holy-symbol': ['magic', 1 / 8], 'tarot-cards': ['magic', 1 / 8], unarmed: ['power', 1 / 8] });
const ENEMY_DROP_SETS = Object.freeze({ regular: Object.freeze({ setCount: 1, tagBudget: 5 }), midBoss: Object.freeze({ setCount: 2, tagBudget: 10 }), boss: Object.freeze({ setCount: 3, tagBudget: 15 }) });
export const BATTLE_VICTORY_DELAY_TICKS = 200;
export function getAttackDamage(actor, attack) { const [stat, multiplier] = Array.isArray(attack) ? attack : [attack.stat, attack.multiplier]; return ((actor.getStatus(stat) + 0.5) / (stat === 'magic' ? 4 : 2)) * multiplier; }
export function getRandomModifier(random = Math.random) { return getCombatRandomModifier(random); }
export { getActionGaugeBaseMaximum, getActionGaugeMaximum };
export default class BattleSystem {
  constructor(board, { controller, itemFactory, enemyFactory = new EnemyFactory({ itemFactory }), uniqueSkillSystem = null, targetingSystem = null, attributeSystem = null, damageSystem = null, actionGaugeSystem = new CombatActionGaugeSystem(), weaponEffectSystem = null, actionLog = null, returnSystem, effects = null, gameLog = null, textRepository = null, random = Math.random, onDamage = null } = {}) {
    Object.assign(this, { board, controller, itemFactory, enemyFactory, returnSystem, effects, gameLog, textRepository, random, onDamage });
    this.uniqueSkillSystem = uniqueSkillSystem ?? new UniqueSkillSystem({ board, controller, enemyFactory, random });
    this.targetingSystem = targetingSystem ?? new CombatTargetingSystem(board);
    this.actionGaugeSystem = actionGaugeSystem;
    this.actionLog = actionLog ?? new CombatActionLog({ gameLog, textRepository });
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
    this.contributionPoints = 0; this.battleStartTick = null; this.defeatTick = null; this.victoryTick = null; this.stageCompleteTick = null; this.victoryDelayTicks = 0; this.hasEncounteredEnemy = false; this.phantomHeads = [];
  }
  resetStageState() {
    this.clearPhantomHeads();
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
    const activeEnemies = [...new Set([...stageEnemies.filter((e) => isEntityOnBoard(this.board, e)), ...this.phantomHeads.filter((e) => isEntityOnBoard(this.board, e))])];
    if (activeEnemies.length > 0) this.hasEncounteredEnemy = true;
    if (this.battleStartTick === null && activeEnemies.some((e) => e.chip.isSettled)) this.battleStartTick = tick;
    if (this.battleStartTick === null) return;
    if (this.hasStageVictory()) {
      this.clearPhantomHeads();
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
    if (target) this.resolveAction(actor, target, participants);
    else if (actor.isPhantomHead) this.returnAreaHead(actor);
    else this.uniqueSkillSystem.refreshBlessingSkills(actor);
  }
  updateActionGaugeMaximum(actor) { return this.actionGaugeSystem.updateMaximum(actor); }
  findTarget(actor, participants) { return this.targetingSystem.findTarget(actor, participants); }
  rangeTargets(actor, target, participants) { return this.targetingSystem.rangeTargets(actor, target, participants); }
  createRangeLane(actor, foes) { return this.targetingSystem.createRangeLane(actor, foes); }
  isAttackMiss(actor, target) {
    const evade = this.random() * Math.max(0, target.getLuckDegree() + target.getTagSkillLevel('feather') * 0.1);
    const accuracy = this.random() * Math.max(0, actor.getLuckDegree() - actor.attributes.water * 0.1 * (1 - actor.getTagSkillLevel('cloth') * 0.1));
    return evade > accuracy;
  }
  applyAttributes(actor, target, coefficient) { this.attributeSystem.applyAttributes(actor, target, coefficient); }
  resolveAction(actor, target, participants, { preserveGaugePresentation = false } = {}) {
    const targets = this.rangeTargets(actor, target, participants); this.actionLog.begin(); this.effects?.attack(actor, actor.getTagCount('area'), { showGaugeAtMaximum: !preserveGaugePresentation }); this.effects?.beginAction(actor);
    targets.forEach(({ target: t, coefficient }) => this.applyAttributes(actor, t, coefficient));
    this.attackTypes(actor).forEach((type) => this.resolveWeapon(actor, target, type, participants));
    this.resolveVitality(actor);
    this.effects?.endAction(); this.actionLog.flush(); actor.luckBonus = 0;
    if (actor.isPhantomHead) this.returnAreaHead(actor);
    else {
      this.resolveActionUniqueSkill(actor, participants);
      this.uniqueSkillSystem.refreshBlessingSkills(actor);
    }
  }
  attackTypes(actor) {
    if (isHeroCombatant(actor)) return [actor.equipment.rightHand, actor.equipment.leftHand].map((item) => item?.category === 'weapon' ? item.type : 'unarmed');
    const weapons = actor.equipment.filter((item) => item.category === 'weapon').map((item) => item.type); return weapons.length ? weapons : ['unarmed'];
  }
  resolveVitality(actor) {
    const tagCount = actor.getTagCount('vitality');
    if (!tagCount || this.random() >= actor.getLuckDegree()) return 0;
    const recovery = tagCount * 0.2;
    if (isHeroCombatant(actor)) {
      const previous = actor.stamina;
      actor.stamina = Math.min(actor.maximums.stamina, actor.stamina + recovery);
      return actor.stamina - previous;
    }
    const previous = actor.hp;
    actor.hp = Math.min(actor.maximumHp, actor.hp + recovery);
    return actor.hp - previous;
  }
  resolveWeapon(actor, target, type, participants) {
    if (!isEntityOnBoard(this.board, target)) return;
    this.weaponEffectSystem.applySupportEffect(actor, type, participants);
    if (this.isAttackMiss(actor, target)) { this.effects?.miss(target); this.recordMiss(actor, target); return; }
    const attack = WEAPON_ATTACKS[type];
    this.rangeTargets(actor, target, participants).forEach(({ target: t, coefficient }) => {
      const statTag = attack[0] === 'magic' ? 'arcane' : 'valor'; const skillLevel = actor.getTagSkillLevel(statTag); const crit = skillLevel > 0 && this.random() < actor.getLuckDegree() + actor.luckBonus; const damage = getAttackDamage(actor, attack) * coefficient * getRandomModifier(this.random) * (crit ? 1 + skillLevel ** 2 * .1 : 1);
      if (type === 'orb') this.applyOrb(actor, t, coefficient);
      if (type === 'claw') this.resolveTheft(actor, t);
      const dealt = attack[0] === 'power'
        ? this.applyPhysicalDamage(actor, t, type, damage, crit, participants)
        : this.applyDamage(actor, t, type, damage, crit);
      this.propagate(actor, t, type, dealt, participants);
    });
  }
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
  resolveActionUniqueSkill(enemy, participants = []) {
    const reservedSlots = this.phantomHeads.map((head) => head.slotPosition);
    const { skill, heads } = this.uniqueSkillSystem.resolveOnAction?.(enemy, { reservedSlots }) ?? { skill: null, heads: [] };
    heads.forEach((head) => this.launchAreaHead(enemy, head));
    const cooperatingMinions = skill?.id === 'area-head-rush'
      ? participants.filter((actor) => actor !== enemy && !isHeroCombatant(actor) && !actor.isPhantomHead && isEntityOnBoard(this.board, actor)
        && (actor.rank === 'regular' || (skill.level === 2 && actor.rank === 'midBoss')))
      : [];
    cooperatingMinions.forEach((actor) => {
      const target = this.findTarget(actor, participants);
      if (target) this.resolveAction(actor, target, participants, { preserveGaugePresentation: true });
    });
    if (skill && (heads.length > 0 || cooperatingMinions.length > 0)) {
      logText(this.gameLog, this.textRepository, heads.length > 0 ? (cooperatingMinions.length > 0 ? 'logHeadsMinions' : 'logHeads') : 'logMinions', { actor: entityText(enemy), skill: { kind: 'unique-skill', id: skill.id }, count: heads.length, minions: cooperatingMinions.length }, { subject: 'enemy', level: 'info', channel: 'battle' });
    }
  }
  launchAreaHead(source, head) {
    this.phantomHeads.push(head);
    const maximum = this.updateActionGaugeMaximum(head);
    head.chip.actionGauge = maximum;
    const placeHead = () => {
      if (!this.phantomHeads.includes(head)) return;
      if (this.controller?.add) this.controller.add(head);
      else this.board.addChip(head.chip);
    };
    const animated = this.controller?.animateChipTransfer?.(head, {
      from: { x: source.chip.x, y: source.chip.y },
      to: { x: head.chip.x, y: head.chip.y },
      onComplete: placeHead,
    });
    if (!animated) placeHead();
  }
  returnAreaHead(head, { animate = true } = {}) {
    if (!this.phantomHeads.includes(head)) return;
    if (this.controller?.destroy) this.controller.destroy(head);
    else {
      this.board.removeChip(head.chip);
      this.controller?.remove?.(head);
    }
    this.phantomHeads = this.phantomHeads.filter((current) => current !== head);
    const source = head.projectionSource;
    if (!animate || !source || !isEntityOnBoard(this.board, source)) return;
    this.controller?.animateChipTransfer?.(head, {
      from: { x: head.chip.x, y: head.chip.y },
      to: { x: source.chip.x, y: source.chip.y },
    });
  }
  clearPhantomHeads() {
    [...this.phantomHeads].forEach((head) => this.returnAreaHead(head, { animate: false }));
  }
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
  createEnemyDrops(enemy) {
    const config = ENEMY_DROP_SETS[enemy.rank] ?? ENEMY_DROP_SETS.regular;
    return Array.from({ length: config.setCount }, () => createTrendEquipmentSet({
      trendTag: enemy.mainTag,
      tagBudget: config.tagBudget,
      itemFactory: this.itemFactory,
      random: this.random,
      placePart: () => this.getWarehouseDropPosition(),
    }).map(({ item }) => item)).flat();
  }
  defeatEnemy(enemy) {
    if (!isEntityOnBoard(this.board, enemy)) return;
    const { skill, summons } = this.uniqueSkillSystem.resolveOnDefeated(enemy);
    this.phantomHeads.filter((head) => head.projectionSource === enemy).forEach((head) => this.returnAreaHead(head, { animate: false }));
    if (this.controller?.destroy) this.controller.destroy(enemy, { includeRelated: true });
    else {
      this.board.removeChip(enemy.chip);
      this.controller?.remove(enemy);
    }
    this.contributionPoints += enemy.contributionPoints;
    this.createEnemyDrops(enemy).forEach((item) => this.controller?.addToWarehouse(item));
    summons.forEach((summon) => {
      summon.chip.beginDrop();
      this.controller?.add(summon);
    });
    if (skill && summons.length > 0) logText(this.gameLog, this.textRepository, 'logSummon', { actor: entityText(enemy), skill: { kind: 'unique-skill', id: skill.id }, target: entityText(summons[0]), count: summons.length }, { subject: 'enemy', level: 'info', channel: 'battle' });
  }
  getElapsedTicks(tick) { return this.battleStartTick === null ? null : Math.max(0, Math.round((this.defeatTick ?? tick) - this.battleStartTick)); }
}
export { ACTION_GAUGE_BASE_RATE, ACTION_GAUGE_WEIGHT_SCALE, BOW_GAUGE_SHORTENING_PER_WEAPON, MAX_BOW_GAUGE_SHORTENING_WEAPONS };
