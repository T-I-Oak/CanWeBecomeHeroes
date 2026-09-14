import { logText, entityText } from './LocalizedLog.js';
import { GAME_AREAS } from './GameAreas.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagPrice, getTagWeight } from './TagCatalog.js';
import { createTrendEquipmentSet } from './TrendEquipmentGenerator.js';
import EnemyFactory from './EnemyFactory.js';
import UniqueSkillSystem from './UniqueSkillSystem.js';

const TICKS_PER_SECOND = 60;
const ACTION_GAUGE_BASE_RATE = 13 / 300;
const ACTION_GAUGE_WEIGHT_SCALE = 25;
const ATTRIBUTE_TICK_INTERVAL = 60;
const RANGE = [[1], [0.6, 0.7, 0.6], [0.7, 0.8, 0.7], [0.5, 0.7, 0.8, 0.7, 0.5], [0.6, 0.8, 0.9, 0.8, 0.6], [0.6, 0.7, 0.8, 0.9, 0.8, 0.7, 0.6], [0.7, 0.8, 0.9, 1, 0.9, 0.8, 0.7], [0.7, 0.8, 0.9, 1, 1, 1, 0.9, 0.8, 0.7]];
export const WEAPON_ATTACKS = Object.freeze({ sword: ['power', 1], shield: ['power', 1 / 8], claw: ['power', 1 / 8], bow: ['power', 1 / 2], banner: ['magic', 1 / 8], staff: ['magic', 1], 'holy-book': ['magic', 1 / 4], orb: ['power', 1 / 8], 'holy-symbol': ['magic', 1 / 8], 'tarot-cards': ['magic', 1 / 8], unarmed: ['power', 1 / 8] });
const ENEMY_DROP_SETS = Object.freeze({ regular: Object.freeze({ setCount: 1, tagBudget: 5 }), midBoss: Object.freeze({ setCount: 2, tagBudget: 10 }), boss: Object.freeze({ setCount: 3, tagBudget: 15 }) });
const BOW_GAUGE_SHORTENING_PER_WEAPON = 0.1;
const MAX_BOW_GAUGE_SHORTENING_WEAPONS = 5;
const ACTION_TILT_RECOVERY_RADIANS = Math.PI / 24;
const KNOCKBACK_TILT_MAX_RADIANS = Math.PI / 12;
export const BATTLE_VICTORY_DELAY_TICKS = 200;
const isHero = (actor) => actor.chip.type === 'hero';
const onBoard = (board, entity) => board.chips.includes(entity.chip);
const getBattleSlotPosition = (actor) => {
  if (Number.isInteger(actor.slotPosition)) return actor.slotPosition;
  const match = /^battle-(\d+)$/.exec(actor.currentSlotId ?? '');
  return match ? Number(match[1]) : null;
};
const getRangeSlotSpan = (actor) => actor.definition?.size === 'large' ? 2 : 1;
export function getAttackDamage(actor, attack) { const [stat, multiplier] = Array.isArray(attack) ? attack : [attack.stat, attack.multiplier]; return ((actor.getStatus(stat) + 0.5) / (stat === 'magic' ? 4 : 2)) * multiplier; }
export function getRandomModifier(random = Math.random) { return 0.8 + random() * 0.4; }
export function getActionGaugeBaseMaximum(actor) { return 15 - actor.getStatus('speed'); }
export function getActionGaugeMaximum(actor) {
  const baseMaximum = getActionGaugeBaseMaximum(actor);
  const equipment = Array.isArray(actor.equipment) ? actor.equipment : Object.values(actor.equipment);
  const bowCount = equipment.filter((item) => item?.category === 'weapon' && item.type === 'bow').length;
  const shortening = Math.min(bowCount, MAX_BOW_GAUGE_SHORTENING_WEAPONS) * BOW_GAUGE_SHORTENING_PER_WEAPON;
  return baseMaximum * (1 - shortening);
}
export default class BattleSystem {
  constructor(board, { controller, itemFactory, enemyFactory = new EnemyFactory({ itemFactory }), uniqueSkillSystem = null, returnSystem, effects = null, gameLog = null, textRepository = null, random = Math.random, onDamage = null } = {}) {
    Object.assign(this, { board, controller, itemFactory, enemyFactory, returnSystem, effects, gameLog, textRepository, random, onDamage });
    this.uniqueSkillSystem = uniqueSkillSystem ?? new UniqueSkillSystem({ board, controller, enemyFactory, random });
    this.contributionPoints = 0; this.battleStartTick = null; this.defeatTick = null; this.victoryTick = null; this.stageCompleteTick = null; this.victoryDelayTicks = 0; this.hasEncounteredEnemy = false; this.attributeTicks = 0; this.phantomHeads = [];
  }
  resetStageState() {
    this.clearPhantomHeads();
    this.battleStartTick = null;
    this.defeatTick = null;
    this.victoryTick = null;
    this.stageCompleteTick = null;
    this.victoryDelayTicks = 0;
    this.hasEncounteredEnemy = false;
    this.attributeTicks = 0;
  }
  hasStageVictory() { return this.victoryTick !== null; }
  isStageComplete() { return this.stageCompleteTick !== null; }
  update({ heroes, enemies, tick, tickDelta }) {
    [...heroes, ...enemies].filter((a) => a.currentArea !== 'battle' || a.targetArea).forEach((a) => a.clearBattleState?.());
    const stageEnemies = this.controller?.getEnemies?.() ?? enemies;
    const activeEnemies = [...new Set([...stageEnemies.filter((e) => onBoard(this.board, e)), ...this.phantomHeads.filter((e) => onBoard(this.board, e))])];
    if (activeEnemies.length > 0) this.hasEncounteredEnemy = true;
    if (this.battleStartTick === null && activeEnemies.some((e) => e.chip.isSettled)) this.battleStartTick = tick;
    if (this.battleStartTick === null) return;
    if (this.hasStageVictory()) {
      this.clearPhantomHeads();
      this.updateVictoryDelay(tickDelta, tick);
      heroes.forEach((h) => this.returnSystem?.update(h));
      return;
    }
    const participants = [...heroes.filter((h) => h.currentArea === 'battle' && !h.targetArea && onBoard(this.board, h) && h.chip.isSettled), ...activeEnemies.filter((e) => e.chip.isSettled)];
    this.updateAttributes(participants, tickDelta);
    participants.forEach((a) => this.updateActor(a, participants, tickDelta));
    const remainingEnemies = this.controller?.getEnemies?.() ?? stageEnemies;
    if (this.hasEncounteredEnemy && remainingEnemies.every((e) => !onBoard(this.board, e)) && this.defeatTick === null) {
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
  updateAttributes(participants, delta) {
    this.attributeTicks += delta;
    while (this.attributeTicks >= ATTRIBUTE_TICK_INTERVAL) {
      this.attributeTicks -= ATTRIBUTE_TICK_INTERVAL;
      participants.forEach((actor) => {
        const a = actor.attributes;
        if (a.fire > 0) this.applyDamage(actor.attributeSources?.fire ?? null, actor, 'fire', a.fire * 0.1 * (1 - actor.getTagSkillLevel('cloth') * 0.1));
        ['fire', 'water', 'lightning'].forEach((key) => { a[key] = Math.max(0, a[key] * 0.95 - 0.1); });
        actor.chip.attributeValues = a;
      });
    }
  }
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
  applyKnockbackTilt(target, damage) {
    const amount = Math.min(damage * 100, 100) / 100 * KNOCKBACK_TILT_MAX_RADIANS;
    target.chip.tilt += this.random() < 0.5 ? -amount : amount;
  }
  updateActionGaugeMaximum(actor) {
    const maximum = getActionGaugeMaximum(actor);
    actor.chip.actionGaugeBaseMaximum = getActionGaugeBaseMaximum(actor);
    actor.chip.actionGaugeMaximum = maximum;
    return maximum;
  }
  findTarget(actor, participants) {
    let candidates = participants.filter((c) => isHero(c) !== isHero(actor) && !c.isPhantomHead && onBoard(this.board, c));
    const equipment = isHero(actor) ? [actor.equipment.rightHand, actor.equipment.leftHand] : actor.equipment;
    const distance = (candidate) => Math.hypot(candidate.chip.x - actor.chip.x, candidate.chip.y - actor.chip.y);
    const selectCandidates = (type) => {
      if (candidates.length <= 1) return;
      const equipmentTagCount = (candidate) => Object.values(candidate.equipment).reduce((total, item) => total + (item?.tags?.length ?? 0), 0);
      const values = candidates.map((candidate) => {
        if (type === 'sword') return isHero(candidate) ? candidate.stamina : candidate.hp;
        if (['staff', 'holy-symbol', 'holy-book', 'banner', 'tarot-cards'].includes(type)) return -(isHero(candidate) ? candidate.stamina : candidate.hp);
        if (type === 'claw') return equipmentTagCount(candidate);
        if (type === 'orb') return -candidate.getCarriedWeight();
        if (type === 'shield') return -distance(candidate);
        if (type === 'bow') return distance(candidate);
        return null;
      });
      if (values[0] === null) return;
      const best = Math.max(...values);
      candidates = candidates.filter((candidate, index) => values[index] === best);
    };
    equipment.filter((item) => item?.category === 'weapon').forEach((item) => selectCandidates(item.type));
    return candidates.toSorted((a, b) => (
      distance(a) - distance(b)
      || a.chip.x - b.chip.x
    ))[0] ?? null;
  }
  rangeTargets(actor, target, participants) {
    const coefficients = RANGE[actor.getTagCount('area')];
    const foes = participants.filter((candidate) => isHero(candidate) !== isHero(actor) && !candidate.isPhantomHead && onBoard(this.board, candidate));
    const lane = this.createRangeLane(actor, foes);
    const at = lane.indexOf(target);
    const center = Math.floor(coefficients.length / 2);
    return coefficients.map((coefficient, index) => ({ target: lane[at + index - center], coefficient })).filter(({ target: candidate }) => candidate);
  }
  createRangeLane(actor, foes) {
    const slotCount = isHero(actor) ? 6 : 4;
    const bySlot = new Map(foes.map((foe) => [getBattleSlotPosition(foe), foe]));
    const hasCompleteSlotPositions = foes.every((foe) => {
      const slot = getBattleSlotPosition(foe);
      return Number.isInteger(slot) && slot >= 1 && slot <= slotCount;
    });
    if (!hasCompleteSlotPositions) return foes.toSorted((left, right) => left.chip.x - right.chip.x);

    const lane = [];
    for (let slot = 1; slot <= slotCount; slot += 1) {
      const foe = bySlot.get(slot) ?? null;
      lane.push(foe);
      if (foe) slot += getRangeSlotSpan(foe) - 1;
    }
    return lane;
  }
  isAttackMiss(actor, target) {
    const evade = this.random() * Math.max(0, target.getLuckDegree() + target.getTagSkillLevel('feather') * 0.1);
    const accuracy = this.random() * Math.max(0, actor.getLuckDegree() - actor.attributes.water * 0.1 * (1 - actor.getTagSkillLevel('cloth') * 0.1));
    return evade > accuracy;
  }
  applyAttributes(actor, target, coefficient) {
    ['fire', 'water', 'lightning'].forEach((tag) => {
      const tagCount = actor.getTagCount(tag);
      if (!tagCount) return;
      const luckDegree = Math.max(0, actor.getLuckDegree());
      const luckRoll = this.random();
      const applicationRate = luckDegree > 0 ? 1 - Math.min(luckRoll / luckDegree, 1) : 0;
      const value = tagCount * coefficient * applicationRate * getRandomModifier(this.random);
      if (value > target.attributes[tag]) {
        target.attributes[tag] = value;
        target.attributeSources[tag] = actor;
      }
      target.chip.attributeValues = target.attributes;
    });
  }
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
    if (isHero(actor)) return [actor.equipment.rightHand, actor.equipment.leftHand].map((item) => item?.category === 'weapon' ? item.type : 'unarmed');
    const weapons = actor.equipment.filter((item) => item.category === 'weapon').map((item) => item.type); return weapons.length ? weapons : ['unarmed'];
  }
  resolveVitality(actor) {
    const tagCount = actor.getTagCount('vitality');
    if (!tagCount || this.random() >= actor.getLuckDegree()) return 0;
    const recovery = tagCount * 0.2;
    if (isHero(actor)) {
      const previous = actor.stamina;
      actor.stamina = Math.min(actor.maximums.stamina, actor.stamina + recovery);
      return actor.stamina - previous;
    }
    const previous = actor.hp;
    actor.hp = Math.min(actor.maximumHp, actor.hp + recovery);
    return actor.hp - previous;
  }
  resolveWeapon(actor, target, type, participants) {
    if (!onBoard(this.board, target)) return;
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
    participants.filter((candidate) => isHero(candidate) === isHero(actor)).forEach((ally) => {
      this.setPhysicalDamageReduction(ally, Math.max(ally.physicalDamageReduction, reduction));
    });
  }
  applyHolyBook(actor, participants) {
    const reduction = actor.getTagCount('cloth') * 0.05 + 0.025;
    participants.filter((candidate) => isHero(candidate) === isHero(actor)).forEach((ally) => {
      ['fire', 'water', 'lightning'].forEach((attribute) => { ally.attributes[attribute] *= 1 - reduction; });
      ally.chip.attributeValues = ally.attributes;
    });
  }
  applyBanner(actor, participants) {
    const gaugeIncrease = actor.getTagCount('reputation') * 0.05 + 0.025;
    participants.filter((candidate) => candidate !== actor && isHero(candidate) === isHero(actor)).forEach((ally) => {
      ally.chip.actionGauge = (ally.chip.actionGauge ?? 0) + getActionGaugeBaseMaximum(ally) * gaugeIncrease;
    });
  }
  applyHolySymbol(actor, participants) {
    const recovery = actor.getTagCount('blessing') * 0.05 + 0.05;
    participants.filter((candidate) => candidate !== actor && isHero(candidate) === isHero(actor)).forEach((ally) => {
      if (isHero(ally)) ally.stamina = Math.min(ally.maximums.stamina, ally.stamina + recovery);
      else ally.hp = Math.min(ally.maximumHp, ally.hp + recovery);
    });
  }
  applyTarotCards(actor, participants) {
    const bonus = actor.getTagCount('fortune') * 0.1 + 0.05;
    participants.filter((candidate) => candidate !== actor && isHero(candidate) === isHero(actor)).forEach((ally) => {
      ally.luckBonus = Math.max(ally.luckBonus, bonus);
    });
  }
  applyPhysicalDamage(actor, target, type, damage, critical, participants) {
    const absorbed = Math.min(target.physicalDamageReduction, damage);
    this.setPhysicalDamageReduction(target, Math.max(0, target.physicalDamageReduction - absorbed));
    const afterProtection = Math.max(0, damage - absorbed * 0.5);
    const reflected = afterProtection * target.getTagSkillLevel('iron') * 0.2;
    const dealt = Math.max(0, afterProtection - reflected);
    this.applyDamage(actor, target, type, dealt, critical);
    if (reflected >= 0.01) {
      this.applyDamage(target, actor, 'reflection', reflected);
      this.propagate(target, actor, 'reflection', reflected, participants);
    }
    return dealt;
  }
  setPhysicalDamageReduction(target, value) {
    target.physicalDamageReduction = value;
    target.chip.physicalDamageReduction = value;
  }
  applyOrb(actor, target, coefficient) {
    if (this.random() >= (actor.getLuckDegree() + .3) * coefficient) return;
    const items = (isHero(target) ? Object.values(target.equipment) : target.equipment).filter((item) => item && item.tags.length < 3); const item = items[Math.floor(this.random() * items.length)];
    if (!item?.addTag('gem')) return;
    item.chip.weight = getTagWeight(item.tags);
    item.chip.tagPaths = getTagPaths(item.tags);
    item.chip.tagBaseColors = getTagBaseColors(item.tags);
    item.chip.tagGlyphScales = getTagGlyphScales(item.tags);
    item.price = getTagPrice(item.tags);
    target.refreshDerivedValues?.();
    this.effects?.tagTransfer(actor, target, 'gem');
  }
  getTheftCandidates(target) {
    if (!isHero(target)) return target.equipment;
    return [...(this.controller?.entities?.values?.() ?? [])].filter((entity) => entity.chip.type === 'item' && !entity.isStored && entity.category !== 'destination' && onBoard(this.board, entity));
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
    if (isHero(actor)) {
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
  getLightningTargets(target, participants, value) {
    const targetSlotPosition = getBattleSlotPosition(target);
    if (targetSlotPosition === null) return [];
    const opponentsBySlot = new Map(participants
      .filter((candidate) => candidate !== target && isHero(candidate) === isHero(target) && onBoard(this.board, candidate))
      .map((candidate) => [getBattleSlotPosition(candidate), candidate])
      .filter(([slotPosition]) => slotPosition !== null));
    const maximumDistance = Math.floor(value);
    return [-1, 1].flatMap((direction) => {
      const targets = [];
      for (let distance = 1; distance <= maximumDistance; distance += 1) {
        const candidate = opponentsBySlot.get(targetSlotPosition + direction * distance);
        if (!candidate) break;
        targets.push({ target: candidate, distance });
      }
      return targets;
    }).toSorted((first, second) => first.distance - second.distance || first.target.chip.x - second.target.chip.x);
  }
  propagate(actor, target, type, damage, participants) {
    const value = target.attributes.lightning; if (!value || damage < .01) return;
    this.getLightningTargets(target, participants, value).forEach(({ target: other, distance }) => {
      const dealt = damage * (1 - target.getTagSkillLevel('cloth') * .1) * (value * .1 + .3) ** distance;
      this.effects?.lightningPropagation(target, other);
      this.effects?.lightningHit(other);
      this.applyDamage(actor, other, type, dealt, false);
    });
  }
  applyDamage(actor, target, type, damage, critical = false) {
    if (target.isPhantomHead) return 0;
    if (damage < .01) return 0; this.applyKnockbackTilt(target, damage); this.effects?.damage(target, damage, critical); if (actor) this.recordDamage(actor, target, damage, critical);
    if (isHero(target)) {
      target.stamina = Math.max(0, target.stamina - damage);
      this.onDamage?.({ actor, target, type, damage, critical });
      if (target.stamina === 0) this.returnSystem?.begin(target); return damage;
    }
    target.hp = Math.max(0, target.hp - damage);
    this.resolveDamageUniqueSkill(target);
    this.onDamage?.({ actor, target, type, damage, critical });
    if (target.hp === 0) { if (actor) this.recordDefeat(actor, target); this.defeatEnemy(target); } return damage;
  }
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
      ? participants.filter((actor) => actor !== enemy && !isHero(actor) && !actor.isPhantomHead && onBoard(this.board, actor)
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
    if (!animate || !source || !onBoard(this.board, source)) return;
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
      const subject = isHero(actor) ? 'hero' : 'enemy'; const values = { actor: entityText(actor), target: entityText(target), damage: Math.round(damage * 100) };
      if (defeated) logText(this.gameLog, this.textRepository, 'logDefeat', values, { subject, level: 'info', channel: 'battle' });
      else if (damage >= .01) {
        logText(this.gameLog, this.textRepository, critical ? 'logCritical' : 'logDamage', values, { subject, level: critical ? 'luck' : 'info', channel: 'battle' });
      } else if (miss) logText(this.gameLog, this.textRepository, 'logMiss', values, { subject, level: 'unluck', channel: 'battle' });
    }));
    this.actionLogResults = null;
  }
  getEntityLabel(entity) { return isHero(entity) ? `【${this.textRepository?.getHeroLabel(entity) ?? entity.heroId}】` : `【${this.textRepository?.getName('enemy', entity.definition.id) ?? entity.definition.id}】`; }
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
    if (!onBoard(this.board, enemy)) return;
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
export { ACTION_GAUGE_BASE_RATE, ACTION_GAUGE_WEIGHT_SCALE, TICKS_PER_SECOND, BOW_GAUGE_SHORTENING_PER_WEAPON, MAX_BOW_GAUGE_SHORTENING_WEAPONS };
