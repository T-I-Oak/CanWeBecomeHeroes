import { GAME_AREAS } from './GameAreas.js';
import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagPrice, getTagWeight } from './TagCatalog.js';
import { createTrendEquipmentSet } from './TrendEquipmentGenerator.js';

const TICKS_PER_SECOND = 60;
const ACTION_GAUGE_BASE_RATE = 13 / 300;
const ACTION_GAUGE_WEIGHT_SCALE = 25;
const ATTRIBUTE_TICK_INTERVAL = 60;
const RANGE = [[1], [0.3, 0.5, 0.3], [0.4, 0.5, 0.4], [0.1, 0.4, 0.6, 0.4, 0.1], [0.2, 0.5, 0.6, 0.5, 0.2], [0.1, 0.3, 0.5, 0.7, 0.5, 0.3, 0.1], [0.2, 0.4, 0.6, 0.7, 0.6, 0.4, 0.2], [0.1, 0.3, 0.5, 0.6, 0.8, 0.6, 0.5, 0.3, 0.1]];
const ATTACKS = { sword: ['power', 1], shield: ['power', 1 / 8], claw: ['power', 1 / 8], bow: ['power', 1 / 2], banner: ['power', 1 / 8], staff: ['magic', 1], 'holy-book': ['magic', 1 / 4], orb: ['magic', 1 / 8], 'holy-symbol': ['magic', 1 / 8], 'tarot-cards': ['magic', 1 / 8], unarmed: ['power', 1 / 8] };
const ENEMY_DROP_SETS = Object.freeze({ regular: Object.freeze({ setCount: 1, tagBudget: 5 }), midBoss: Object.freeze({ setCount: 2, tagBudget: 10 }), boss: Object.freeze({ setCount: 3, tagBudget: 15 }) });
const BOW_GAUGE_SHORTENING_PER_WEAPON = 0.1;
const MAX_BOW_GAUGE_SHORTENING_WEAPONS = 5;
const ACTION_TILT_RECOVERY_RADIANS = Math.PI / 24;
const KNOCKBACK_TILT_MIN_RADIANS = Math.PI / 18;
const KNOCKBACK_TILT_RANGE_RADIANS = Math.PI / 18;
export const BATTLE_VICTORY_DELAY_TICKS = 200;
const isHero = (actor) => actor.chip.type === 'hero';
const onBoard = (board, entity) => board.chips.includes(entity.chip);
const getBattleSlotPosition = (actor) => {
  if (Number.isInteger(actor.slotPosition)) return actor.slotPosition;
  const match = /^battle-(\d+)$/.exec(actor.currentSlotId ?? '');
  return match ? Number(match[1]) : null;
};
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
  constructor(board, { controller, itemFactory, returnSystem, effects = null, gameLog = null, random = Math.random, logger = console, onDamage = null } = {}) {
    Object.assign(this, { board, controller, itemFactory, returnSystem, effects, gameLog, random, logger, onDamage });
    this.contributionPoints = 0; this.battleStartTick = null; this.defeatTick = null; this.victoryTick = null; this.stageCompleteTick = null; this.victoryDelayTicks = 0; this.hasEncounteredEnemy = false; this.attributeTicks = 0;
  }
  resetStageState() {
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
    const activeEnemies = enemies.filter((e) => onBoard(this.board, e));
    if (activeEnemies.length > 0) this.hasEncounteredEnemy = true;
    if (this.battleStartTick === null && activeEnemies.some((e) => e.chip.isSettled)) this.battleStartTick = tick;
    if (this.battleStartTick === null) return;
    if (this.hasStageVictory()) {
      this.updateVictoryDelay(tickDelta, tick);
      heroes.forEach((h) => this.returnSystem?.update(h));
      return;
    }
    const participants = [...heroes.filter((h) => h.currentArea === 'battle' && !h.targetArea && onBoard(this.board, h) && h.chip.isSettled), ...activeEnemies.filter((e) => e.chip.isSettled)];
    this.updateAttributes(participants, tickDelta);
    participants.forEach((a) => this.updateActor(a, participants, tickDelta));
    if (this.hasEncounteredEnemy && enemies.every((e) => !onBoard(this.board, e)) && this.defeatTick === null) {
      this.defeatTick = tick;
      this.victoryTick = tick;
      this.gameLog?.log('敵を全滅させた。', { subject: 'system', level: 'info' });
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
  }
  restoreActionTilt(actor) {
    const { chip } = actor;
    if (Math.abs(chip.tilt) <= ACTION_TILT_RECOVERY_RADIANS) {
      chip.tilt = 0;
      return;
    }
    chip.tilt -= Math.sign(chip.tilt) * ACTION_TILT_RECOVERY_RADIANS;
  }
  applyKnockbackTilt(target) {
    const amount = KNOCKBACK_TILT_MIN_RADIANS + this.random() * KNOCKBACK_TILT_RANGE_RADIANS;
    target.chip.tilt += this.random() < 0.5 ? -amount : amount;
  }
  updateActionGaugeMaximum(actor) {
    const maximum = getActionGaugeMaximum(actor);
    actor.chip.actionGaugeBaseMaximum = getActionGaugeBaseMaximum(actor);
    actor.chip.actionGaugeMaximum = maximum;
    return maximum;
  }
  findTarget(actor, participants) {
    const candidates = participants.filter((c) => isHero(c) !== isHero(actor) && onBoard(this.board, c));
    const front = candidates.filter((c) => Math.abs(c.chip.x - actor.chip.x) < 1);
    return (front.length ? front : candidates).toSorted((a, b) => Math.hypot(a.chip.x - actor.chip.x, a.chip.y - actor.chip.y) - Math.hypot(b.chip.x - actor.chip.x, b.chip.y - actor.chip.y) || a.chip.x - b.chip.x)[0] ?? null;
  }
  rangeTargets(actor, target, participants) {
    const coefficients = RANGE[actor.getTagCount('area')]; const foes = participants.filter((c) => isHero(c) !== isHero(actor) && onBoard(this.board, c)).toSorted((a, b) => a.chip.x - b.chip.x); const at = foes.indexOf(target); const center = Math.floor(coefficients.length / 2);
    return coefficients.map((coefficient, index) => ({ target: foes[at + index - center], coefficient })).filter(({ target: t }) => t);
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
  resolveAction(actor, target, participants) {
    const targets = this.rangeTargets(actor, target, participants); this.actionLogResults = new Map(); this.effects?.attack(actor, actor.getTagCount('area')); this.effects?.beginAction(actor);
    targets.forEach(({ target: t, coefficient }) => this.applyAttributes(actor, t, coefficient));
    this.attackTypes(actor).forEach((type) => this.resolveWeapon(actor, target, type, participants));
    this.resolveVitality(actor);
    this.effects?.endAction(); this.flushActionLogs(); actor.luckBonus = 0;
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
    const attack = ATTACKS[type];
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
    const recovery = actor.getTagCount('blessing') * 0.1 + 0.05;
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
    if (!item?.addTag('gem')) return; item.chip.weight = getTagWeight(item.tags); item.chip.tagPaths = getTagPaths(item.tags); item.chip.tagBaseColors = getTagBaseColors(item.tags); item.chip.tagGlyphScales = getTagGlyphScales(item.tags); item.price = getTagPrice(item.tags); target.refreshDerivedValues?.();
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
      const area = GAME_AREAS.warehouse;
      item.chip.x = area.x + item.chip.radius + this.random() * (area.width - item.chip.radius * 2);
      item.chip.y = area.y + item.chip.radius + this.random() * (area.height - item.chip.radius * 2);
      item.chip.scale = 1;
      this.controller?.addToWarehouse?.(item);
      return;
    }
    this.controller?.remove?.(item);
    actor.addEquipment(item);
    this.updateActionGaugeMaximum(actor);
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
    if (damage < .01) return 0; this.applyKnockbackTilt(target); this.effects?.damage(target, damage, critical); if (actor) this.recordDamage(actor, target, damage, critical);
    if (isHero(target)) {
      target.stamina = Math.max(0, target.stamina - damage);
      this.onDamage?.({ actor, target, type, damage, critical });
      if (actor) this.logDamage(actor, target, type, damage, `スタミナ ${target.stamina.toFixed(2)}`); if (target.stamina === 0) this.returnSystem?.begin(target); return damage;
    }
    target.hp = Math.max(0, target.hp - damage);
    this.onDamage?.({ actor, target, type, damage, critical });
    if (actor) this.logDamage(actor, target, type, damage, `HP ${target.hp.toFixed(2)}/${target.maximumHp}`); if (target.hp === 0) { if (actor) this.recordDefeat(actor, target); this.defeatEnemy(target); } return damage;
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
      const subject = isHero(actor) ? 'hero' : 'enemy'; const actorLabel = this.getEntityLabel(actor); const targetLabel = this.getEntityLabel(target);
      if (defeated) this.gameLog?.log(`${actorLabel}は${targetLabel}を倒した。`, { subject, level: 'info' });
      else if (damage >= .01) {
        const message = critical
          ? `${actorLabel}は${targetLabel}に会心ダメージ${Math.round(damage * 100)}を与えた。`
          : `${actorLabel}は${targetLabel}にダメージ${Math.round(damage * 100)}を与えた。`;
        this.gameLog?.log(message, { subject, level: critical ? 'luck' : 'info' });
      } else if (miss) this.gameLog?.log(`${actorLabel}の${targetLabel}への攻撃は外れた。`, { subject, level: 'unluck' });
    }));
    this.actionLogResults = null;
  }
  getEntityLabel(entity) { return isHero(entity) ? `【${entity.profession}・${entity.name.ja}】` : `【${entity.definition.nameJa}】`; }
  logDamage(actor, target, type, damage, remaining) { this.logger?.info?.(`[Battle] ${this.getEntityLabel(actor)} -> ${this.getEntityLabel(target)} | ${type} | ${damage.toFixed(3)} damage | ${remaining}`); }
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
    this.board.removeChip(enemy.chip);
    this.controller?.remove(enemy);
    this.contributionPoints += enemy.contributionPoints;
    this.createEnemyDrops(enemy).forEach((item) => this.controller?.addToWarehouse(item));
  }
  getElapsedTicks(tick) { return this.battleStartTick === null ? null : Math.max(0, Math.round((this.defeatTick ?? tick) - this.battleStartTick)); }
}
export { ACTION_GAUGE_BASE_RATE, ACTION_GAUGE_WEIGHT_SCALE, TICKS_PER_SECOND, BOW_GAUGE_SHORTENING_PER_WEAPON, MAX_BOW_GAUGE_SHORTENING_WEAPONS };
