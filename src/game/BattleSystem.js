import { GAME_AREAS } from './GameAreas.js';
import { getTagPaths, getTagPrice, getTagWeight } from './TagCatalog.js';

const TICKS_PER_SECOND = 60;
const ACTION_GAUGE_BASE_RATE = 13 / 300;
const ACTION_GAUGE_WEIGHT_SCALE = 25;
const ATTRIBUTE_TICK_INTERVAL = 60;
const RANGE = [[1], [0.3, 0.5, 0.3], [0.4, 0.5, 0.4], [0.1, 0.4, 0.6, 0.4, 0.1], [0.2, 0.5, 0.6, 0.5, 0.2], [0.1, 0.3, 0.5, 0.7, 0.5, 0.3, 0.1], [0.2, 0.4, 0.6, 0.7, 0.6, 0.4, 0.2], [0.1, 0.3, 0.5, 0.6, 0.8, 0.6, 0.5, 0.3, 0.1]];
const ATTACKS = { sword: ['power', 1], shield: ['power', 1 / 8], claw: ['power', 1 / 8], bow: ['power', 1 / 2], banner: ['power', 1 / 8], staff: ['magic', 1], 'holy-book': ['magic', 1 / 4], orb: ['magic', 1 / 8], 'holy-symbol': ['magic', 1 / 8], 'tarot-cards': ['magic', 1 / 8], unarmed: ['power', 1 / 8] };
const isHero = (actor) => actor.chip.type === 'hero';
const onBoard = (board, entity) => board.chips.includes(entity.chip);
export function getAttackDamage(actor, attack) { const [stat, multiplier] = Array.isArray(attack) ? attack : [attack.stat, attack.multiplier]; return ((actor.getStatus(stat) + 0.5) / (stat === 'magic' ? 4 : 2)) * multiplier; }

export default class BattleSystem {
  constructor(board, { controller, itemFactory, returnSystem, effects = null, gameLog = null, random = Math.random, logger = console } = {}) {
    Object.assign(this, { board, controller, itemFactory, returnSystem, effects, gameLog, random, logger });
    this.contributionPoints = 0; this.battleStartTick = null; this.defeatTick = null; this.attributeTicks = 0;
  }
  update({ heroes, enemies, tick, tickDelta }) {
    [...heroes, ...enemies].filter((a) => a.currentArea !== 'battle' || a.targetArea).forEach((a) => { a.chip.actionGauge = null; a.chip.actionGaugeMaximum = null; });
    const activeEnemies = enemies.filter((e) => onBoard(this.board, e));
    if (this.battleStartTick === null && activeEnemies.some((e) => e.chip.isSettled)) this.battleStartTick = tick;
    if (this.battleStartTick === null) return;
    const participants = [...heroes.filter((h) => h.currentArea === 'battle' && !h.targetArea && onBoard(this.board, h) && h.chip.isSettled), ...activeEnemies.filter((e) => e.chip.isSettled)];
    this.updateAttributes(participants, tickDelta);
    participants.forEach((a) => this.updateActor(a, participants, tickDelta));
    if (enemies.every((e) => !onBoard(this.board, e)) && this.defeatTick === null) this.defeatTick = tick;
    heroes.forEach((h) => this.returnSystem?.update(h));
  }
  updateAttributes(participants, delta) {
    this.attributeTicks += delta;
    while (this.attributeTicks >= ATTRIBUTE_TICK_INTERVAL) {
      this.attributeTicks -= ATTRIBUTE_TICK_INTERVAL;
      participants.forEach((actor) => {
        const a = actor.attributes;
        if (a.fire > 0) this.applyDamage(null, actor, 'fire', a.fire * 0.1);
        ['fire', 'water', 'lightning'].forEach((key) => { a[key] = Math.max(0, a[key] * 0.95 - 0.1); });
        actor.chip.attributeValues = a;
      });
    }
  }
  updateActor(actor, participants, delta) {
    const max = 15 - actor.getStatus('speed');
    actor.chip.actionGaugeMaximum = max;
    actor.chip.actionGauge = (actor.chip.actionGauge ?? 0) + ACTION_GAUGE_BASE_RATE / (1 + (actor.getCarriedWeight() / ACTION_GAUGE_WEIGHT_SCALE) ** 2) * delta;
    if (actor.chip.actionGauge < max) return;
    actor.chip.actionGauge = 0;
    const target = this.findTarget(actor, participants);
    if (target) this.resolveAction(actor, target, participants);
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
  resolveAction(actor, target, participants) {
    const targets = this.rangeTargets(actor, target, participants); this.actionLogResults = new Map(); this.effects?.attack(actor, actor.getTagCount('area')); this.effects?.beginAction(actor);
    targets.forEach(({ target: t, coefficient }) => ['fire', 'water', 'lightning'].forEach((tag) => { const value = actor.getTagCount(tag) * coefficient; if (value) { t.attributes[tag] = Math.max(t.attributes[tag], value); t.chip.attributeValues = t.attributes; } }));
    this.attackTypes(actor).forEach((type) => this.resolveWeapon(actor, target, type, participants)); this.effects?.endAction(); this.flushActionLogs(); actor.luckBonus = 0;
  }
  attackTypes(actor) {
    if (isHero(actor)) return [actor.equipment.rightHand, actor.equipment.leftHand].map((item) => item?.category === 'weapon' ? item.type : 'unarmed');
    const weapons = actor.equipment.filter((item) => item.category === 'weapon').map((item) => item.type); return weapons.length ? weapons : ['unarmed'];
  }
  resolveWeapon(actor, target, type, participants) {
    if (!onBoard(this.board, target)) return;
    if (type === 'shield') this.applyShield(actor, participants);
    const evade = this.random() * Math.max(0, target.getLuckDegree() + target.getTagSkillLevel('feather') * .1); const accuracy = this.random() * Math.max(0, actor.getLuckDegree() - actor.attributes.water * .1);
    if (evade > accuracy) { this.effects?.miss(target); this.recordMiss(actor, target); return; }
    const attack = ATTACKS[type];
    this.rangeTargets(actor, target, participants).forEach(({ target: t, coefficient }) => {
      const statTag = attack[0] === 'magic' ? 'arcane' : 'valor'; const crit = actor.getTagCount(statTag) > 0 && this.random() < actor.getLuckDegree() + actor.luckBonus; const damage = getAttackDamage(actor, attack) * coefficient * (crit ? 1 + actor.getTagCount(statTag) ** 2 * .1 : 1);
      if (type === 'orb') this.applyOrb(actor, t, coefficient);
      const dealt = attack[0] === 'power'
        ? this.applyPhysicalDamage(actor, t, type, damage, crit, participants)
        : this.applyDamage(actor, t, type, damage, crit);
      this.propagate(actor, t, type, dealt, participants);
    });
  }
  applyShield(actor, participants) {
    const reduction = actor.getTagCount('iron') * 0.1;
    participants.filter((candidate) => isHero(candidate) === isHero(actor)).forEach((ally) => {
      ally.physicalDamageReduction = Math.max(ally.physicalDamageReduction, reduction);
    });
  }
  applyPhysicalDamage(actor, target, type, damage, critical, participants) {
    const absorbed = Math.min(target.physicalDamageReduction, damage);
    target.physicalDamageReduction = Math.max(0, target.physicalDamageReduction - absorbed);
    const afterProtection = Math.max(0, damage - absorbed * 0.5);
    const reflected = target.getTagSkillLevel('iron') > 0 ? afterProtection * target.getTagCount('iron') * 0.1 : 0;
    const dealt = Math.max(0, afterProtection - reflected);
    this.applyDamage(actor, target, type, dealt, critical);
    if (reflected >= 0.01) {
      this.applyDamage(target, actor, 'reflection', reflected);
      this.propagate(target, actor, 'reflection', reflected, participants);
    }
    return dealt;
  }
  applyOrb(actor, target, coefficient) {
    if (this.random() >= (actor.getLuckDegree() + .3) * coefficient) return;
    const items = (isHero(target) ? Object.values(target.equipment) : target.equipment).filter((item) => item && item.tags.length < 3); const item = items[Math.floor(this.random() * items.length)];
    if (!item?.addTag('gem')) return; item.chip.weight = getTagWeight(item.tags); item.chip.tagPaths = getTagPaths(item.tags); item.price = getTagPrice(item.tags); target.refreshDerivedValues?.();
  }
  propagate(actor, target, type, damage, participants) {
    const value = target.attributes.lightning; if (!value || damage < .01) return;
    participants.filter((c) => isHero(c) !== isHero(actor) && c !== target && onBoard(this.board, c)).toSorted((a, b) => Math.abs(a.chip.x - target.chip.x) - Math.abs(b.chip.x - target.chip.x)).slice(0, Math.floor(value)).forEach((other, index) => { const dealt = damage * (value * .1 + .3) ** (index + 1); this.effects?.lightningPropagation(target, other); this.effects?.lightningHit(other); this.applyDamage(actor, other, type, dealt, false); });
  }
  applyDamage(actor, target, type, damage, critical = false) {
    if (damage < .01) return 0; this.effects?.damage(target, damage, critical); if (actor) this.recordDamage(actor, target, damage, critical);
    if (isHero(target)) { target.stamina = Math.max(0, target.stamina - damage); if (actor) this.logDamage(actor, target, type, damage, `スタミナ ${target.stamina.toFixed(2)}`); if (target.stamina === 0) this.returnSystem?.begin(target); return damage; }
    target.hp = Math.max(0, target.hp - damage); if (actor) this.logDamage(actor, target, type, damage, `HP ${target.hp.toFixed(2)}/${target.maximumHp}`); if (target.hp === 0) { if (actor) this.recordDefeat(actor, target); this.defeatEnemy(target); } return damage;
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
  defeatEnemy(enemy) { if (!onBoard(this.board, enemy)) return; this.board.removeChip(enemy.chip); this.controller?.remove(enemy); this.contributionPoints += enemy.contributionPoints; const a = GAME_AREAS.warehouse; const item = this.itemFactory.createBodyItem({ part: 'head', tags: [enemy.definition.tagAffinity], x: a.x + a.width / 2 + (this.random() - .5) * 96, y: a.y + a.height / 2 + (this.random() - .5) * 96, random: this.random }); this.controller?.addToWarehouse(item); }
  getElapsedTicks(tick) { return this.battleStartTick === null ? null : Math.max(0, Math.round((this.defeatTick ?? tick) - this.battleStartTick)); }
}
export { ACTION_GAUGE_BASE_RATE, ACTION_GAUGE_WEIGHT_SCALE, TICKS_PER_SECOND };
