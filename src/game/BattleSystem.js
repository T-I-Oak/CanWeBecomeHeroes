import { logText, entityText } from './LocalizedLog.js';
import { GAME_AREAS } from './GameAreas.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagValue, getTagWeight } from './TagCatalog.js';
import { createTrendEquipmentSet } from './TrendEquipmentGenerator.js';
import EnemyFactory from './EnemyFactory.js';
import UniqueSkillSystem from './UniqueSkillSystem.js';
import CombatTargetingSystem from './CombatTargetingSystem.js';
import CombatAttributeSystem from './CombatAttributeSystem.js';
import CombatDamageSystem from './CombatDamageSystem.js';
import { getCombatRandomModifier } from './CombatRandom.js';
import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';

const ACTION_GAUGE_BASE_RATE = 13 / 300;
const ACTION_GAUGE_WEIGHT_SCALE = 25;
export const WEAPON_ATTACKS = Object.freeze({ sword: ['power', 1], shield: ['power', 1 / 8], claw: ['power', 1 / 8], bow: ['power', 1 / 2], banner: ['magic', 1 / 8], staff: ['magic', 1], 'holy-book': ['magic', 1 / 4], orb: ['power', 1 / 8], 'holy-symbol': ['magic', 1 / 8], 'tarot-cards': ['magic', 1 / 8], unarmed: ['power', 1 / 8] });
const ENEMY_DROP_SETS = Object.freeze({ regular: Object.freeze({ setCount: 1, tagBudget: 5 }), midBoss: Object.freeze({ setCount: 2, tagBudget: 10 }), boss: Object.freeze({ setCount: 3, tagBudget: 15 }) });
const BOW_GAUGE_SHORTENING_PER_WEAPON = 0.1;
const MAX_BOW_GAUGE_SHORTENING_WEAPONS = 5;
const ACTION_TILT_RECOVERY_RADIANS = Math.PI / 24;
export const BATTLE_VICTORY_DELAY_TICKS = 200;
export function getAttackDamage(actor, attack) { const [stat, multiplier] = Array.isArray(attack) ? attack : [attack.stat, attack.multiplier]; return ((actor.getStatus(stat) + 0.5) / (stat === 'magic' ? 4 : 2)) * multiplier; }
export function getRandomModifier(random = Math.random) { return getCombatRandomModifier(random); }
export function getActionGaugeBaseMaximum(actor) { return 15 - actor.getStatus('speed'); }
export function getActionGaugeMaximum(actor) {
  const baseMaximum = getActionGaugeBaseMaximum(actor);
  const equipment = Array.isArray(actor.equipment) ? actor.equipment : Object.values(actor.equipment);
  const bowCount = equipment.filter((item) => item?.category === 'weapon' && item.type === 'bow').length;
  const shortening = Math.min(bowCount, MAX_BOW_GAUGE_SHORTENING_WEAPONS) * BOW_GAUGE_SHORTENING_PER_WEAPON;
  return baseMaximum * (1 - shortening);
}
export default class BattleSystem {
  constructor(board, { controller, itemFactory, enemyFactory = new EnemyFactory({ itemFactory }), uniqueSkillSystem = null, targetingSystem = null, attributeSystem = null, damageSystem = null, returnSystem, effects = null, gameLog = null, textRepository = null, random = Math.random, onDamage = null } = {}) {
    Object.assign(this, { board, controller, itemFactory, enemyFactory, returnSystem, effects, gameLog, textRepository, random, onDamage });
    this.uniqueSkillSystem = uniqueSkillSystem ?? new UniqueSkillSystem({ board, controller, enemyFactory, random });
    this.targetingSystem = targetingSystem ?? new CombatTargetingSystem(board);
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
    const max = this.updateActionGaugeMaximum(actor);
    actor.chip.actionGauge = (actor.chip.actionGauge ?? 0) + ACTION_GAUGE_BASE_RATE / (1 + (actor.getCarriedWeight() / ACTION_GAUGE_WEIGHT_SCALE) ** 2) * delta;
    if (actor.chip.actionGauge < max) return;
    actor.chip.actionGauge = 0;
    this.restoreActionTilt(actor);
    const target = this.findTarget(actor, participants);
    if (target) this.resolveAction(actor, target, participants);
    else if (actor.isPhantomHead) this.returnAreaHead(actor);
  }
  restoreActionTilt(actor) {
    const { chip } = actor;
    if (Math.abs(chip.tilt) <= ACTION_TILT_RECOVERY_RADIANS) {
      chip.tilt = 0;
      return;
    }
    chip.tilt -= Math.sign(chip.tilt) * ACTION_TILT_RECOVERY_RADIANS;
  }
  updateActionGaugeMaximum(actor) {
    const maximum = getActionGaugeMaximum(actor);
    actor.chip.actionGaugeBaseMaximum = getActionGaugeBaseMaximum(actor);
    actor.chip.actionGaugeMaximum = maximum;
    return maximum;
  }
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
    const targets = this.rangeTargets(actor, target, participants); this.actionLogResults = new Map(); this.effects?.attack(actor, actor.getTagCount('area'), { showGaugeAtMaximum: !preserveGaugePresentation }); this.effects?.beginAction(actor);
    targets.forEach(({ target: t, coefficient }) => this.applyAttributes(actor, t, coefficient));
    this.attackTypes(actor).forEach((type) => this.resolveWeapon(actor, target, type, participants));
    this.resolveVitality(actor);
    this.effects?.endAction(); this.flushActionLogs(); actor.luckBonus = 0;
    if (actor.isPhantomHead) this.returnAreaHead(actor);
    else this.resolveActionUniqueSkill(actor, participants);
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
    if (type === 'shield') this.applyShield(actor, participants);
    if (type === 'holy-book') this.applyHolyBook(actor, participants);
    if (type === 'banner') this.applyBanner(actor, participants);
    if (type === 'holy-symbol') this.applyHolySymbol(actor, participants);
    if (type === 'tarot-cards') this.applyTarotCards(actor, participants);
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
  applyShield(actor, participants) {
    const reduction = actor.getTagCount('iron') * 0.1 + 0.05;
    participants.filter((candidate) => isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      this.setPhysicalDamageReduction(ally, Math.max(ally.physicalDamageReduction, reduction));
    });
  }
  applyHolyBook(actor, participants) {
    const reduction = actor.getTagCount('cloth') * 0.05 + 0.025;
    participants.filter((candidate) => isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      ['fire', 'water', 'lightning'].forEach((attribute) => { ally.attributes[attribute] *= 1 - reduction; });
      ally.chip.attributeValues = ally.attributes;
    });
  }
  applyBanner(actor, participants) {
    const gaugeIncrease = actor.getTagCount('reputation') * 0.05 + 0.025;
    participants.filter((candidate) => candidate !== actor && isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      ally.chip.actionGauge = (ally.chip.actionGauge ?? 0) + getActionGaugeBaseMaximum(ally) * gaugeIncrease;
    });
  }
  applyHolySymbol(actor, participants) {
    const recovery = actor.getTagCount('blessing') * 0.05 + 0.05;
    participants.filter((candidate) => candidate !== actor && isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      if (isHeroCombatant(ally)) ally.stamina = Math.min(ally.maximums.stamina, ally.stamina + recovery);
      else ally.hp = Math.min(ally.maximumHp, ally.hp + recovery);
    });
  }
  applyTarotCards(actor, participants) {
    const bonus = actor.getTagCount('fortune') * 0.1 + 0.05;
    participants.filter((candidate) => candidate !== actor && isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      ally.luckBonus = Math.max(ally.luckBonus, bonus);
    });
  }
  applyPhysicalDamage(actor, target, type, damage, critical, participants) {
    return this.damageSystem.applyPhysicalDamage(actor, target, type, damage, critical, participants, {
      propagate: (...args) => this.propagate(...args),
    });
  }
  setPhysicalDamageReduction(target, value) { this.damageSystem.setPhysicalDamageReduction(target, value); }
  applyOrb(actor, target, coefficient) {
    if (this.random() >= (actor.getLuckDegree() + .3) * coefficient) return;
    const items = (isHeroCombatant(target) ? Object.values(target.equipment) : target.equipment).filter((item) => item && item.tags.length < 3); const item = items[Math.floor(this.random() * items.length)];
    if (!item?.addTag('gem')) return;
    item.chip.weight = getTagWeight(item.tags);
    item.chip.tagPaths = getTagPaths(item.tags);
    item.chip.tagBaseColors = getTagBaseColors(item.tags);
    item.chip.tagGlyphScales = getTagGlyphScales(item.tags);
    item.value = getTagValue(item.tags);
    target.refreshDerivedValues?.();
    this.effects?.tagTransfer(actor, target, 'gem');
  }
  getTheftCandidates(target) {
    if (!isHeroCombatant(target)) return target.equipment;
    return [...(this.controller?.entities?.values?.() ?? [])].filter((entity) => entity.chip.type === 'item' && !entity.isStored && entity.category !== 'destination' && isEntityOnBoard(this.board, entity));
  }
  resolveTheft(actor, target) {
    const candidates = this.getTheftCandidates(target);
    const skillLevel = actor.getTagSkillLevel('dexterity');
    for (let tagCount = 3; tagCount >= 0; tagCount -= 1) {
      if (!candidates.some((item) => item.tags.length >= tagCount)) continue;
      if (skillLevel < tagCount) continue;
      const eligibleCandidates = candidates.filter((item) => item.tags.length <= tagCount);
      if (eligibleCandidates.length === 0) continue;
      const successRate = actor.getLuckDegree() * (skillLevel - tagCount + 1) * 0.2;
      if (this.random() >= successRate) continue;
      const maximumTagCount = Math.max(...eligibleCandidates.map((item) => item.tags.length));
      const choices = eligibleCandidates.filter((item) => item.tags.length === maximumTagCount);
      const item = choices[Math.floor(this.random() * choices.length)];
      this.transferStolenItem(actor, target, item);
      return item;
    }
    return null;
  }
  transferStolenItem(actor, target, item) {
    if (isHeroCombatant(actor)) {
      target.removeEquipment(item);
      this.updateActionGaugeMaximum(target);
      const destination = this.getWarehouseDropPosition();
      const completeTransfer = () => {
        item.chip.x = destination.x;
        item.chip.y = destination.y;
        item.chip.scale = 1;
        this.controller?.addToWarehouse?.(item);
      };
      const animated = this.controller?.animateItemTransfer?.(item, {
        from: { x: target.chip.x, y: target.chip.y },
        to: destination,
        onComplete: completeTransfer,
      });
      if (!animated) completeTransfer();
      return;
    }
    const source = { x: item.chip.x, y: item.chip.y };
    this.controller?.remove?.(item);
    const recipient = actor.projectionSource ?? actor;
    recipient.addEquipment(item);
    this.updateActionGaugeMaximum(recipient);
    this.controller?.animateItemTransfer?.(item, {
      from: source,
      to: { x: actor.chip.x, y: actor.chip.y },
    });
  }
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
  recordMiss(actor, target) {
    if (!this.actionLogResults || !actor || !target) return;
    const result = this.getActionLogResult(actor, target); result.miss = true;
  }
  recordDamage(actor, target, damage, critical) {
    if (!this.actionLogResults || !actor || !target) return;
    const result = this.getActionLogResult(actor, target); result.damage += damage; result.critical ||= critical;
  }
  recordDefeat(actor, target) {
    if (!this.actionLogResults || !actor || !target) return;
    this.getActionLogResult(actor, target).defeated = true;
  }
  getActionLogResult(actor, target) {
    let targets = this.actionLogResults.get(actor);
    if (!targets) { targets = new Map(); this.actionLogResults.set(actor, targets); }
    let result = targets.get(target);
    if (!result) { result = { actor, target, damage: 0, critical: false, miss: false, defeated: false }; targets.set(target, result); }
    return result;
  }
  flushActionLogs() {
    if (!this.actionLogResults) return;
    this.actionLogResults.forEach((targets) => targets.forEach((result) => {
      const { actor, target, damage, critical, miss, defeated } = result;
      const subject = isHeroCombatant(actor) ? 'hero' : 'enemy'; const values = { actor: entityText(actor), target: entityText(target), damage: Math.round(damage * 100) };
      if (defeated) logText(this.gameLog, this.textRepository, 'logDefeat', values, { subject, level: 'info', channel: 'battle' });
      else if (damage >= .01) {
        logText(this.gameLog, this.textRepository, critical ? 'logCritical' : 'logDamage', values, { subject, level: critical ? 'luck' : 'info', channel: 'battle' });
      } else if (miss) logText(this.gameLog, this.textRepository, 'logMiss', values, { subject, level: 'unluck', channel: 'battle' });
    }));
    this.actionLogResults = null;
  }
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
