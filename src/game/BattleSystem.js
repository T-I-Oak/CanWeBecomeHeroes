import { GAME_AREAS } from './GameAreas.js';

const TICKS_PER_SECOND = 60;
const ACTION_GAUGE_BASE_RATE = 13 / 150;
const ACTION_GAUGE_WEIGHT_SCALE = 25;
const ATTACKS = Object.freeze({
  sword: { stat: 'power', multiplier: 1 },
  shield: { stat: 'power', multiplier: 1 / 8 },
  claw: { stat: 'power', multiplier: 1 / 8 },
  bow: { stat: 'power', multiplier: 1 / 2 },
  banner: { stat: 'power', multiplier: 1 / 8 },
  staff: { stat: 'magic', multiplier: 1 },
  'holy-book': { stat: 'magic', multiplier: 1 / 4 },
  orb: { stat: 'magic', multiplier: 1 / 8 },
  'holy-symbol': { stat: 'magic', multiplier: 1 / 8 },
  'tarot-cards': { stat: 'magic', multiplier: 1 / 8 },
  unarmed: { stat: 'power', multiplier: 1 / 8 },
});

export function getAttackDamage(actor, attack) {
  const divisor = attack.stat === 'magic' ? 4 : 2;
  return ((actor.getStatus(attack.stat) + 0.5) / divisor) * attack.multiplier;
}

function isOnBoard(board, entity) {
  return board.chips.includes(entity.chip);
}

function actionGaugeMaximum(actor) {
  return 15 - actor.getStatus('speed');
}

function actionGaugeRate(actor) {
  return ACTION_GAUGE_BASE_RATE / (1 + (actor.getCarriedWeight() / ACTION_GAUGE_WEIGHT_SCALE) ** 2);
}

function isHero(actor) {
  return actor.chip.type === 'hero';
}

export default class BattleSystem {
  constructor(board, { controller, itemFactory, returnSystem, random = Math.random, logger = console } = {}) {
    this.board = board;
    this.controller = controller;
    this.itemFactory = itemFactory;
    this.returnSystem = returnSystem;
    this.random = random;
    this.logger = logger;
    this.contributionPoints = 0;
    this.battleStartTick = null;
    this.defeatTick = null;
  }

  update({ heroes, enemies, tick, tickDelta }) {
    [...heroes, ...enemies]
      .filter((actor) => actor.currentArea !== 'battle' || actor.targetArea)
      .forEach((actor) => {
        actor.chip.actionGauge = null;
        actor.chip.actionGaugeMaximum = null;
      });
    const activeEnemies = enemies.filter((enemy) => isOnBoard(this.board, enemy));
    if (this.battleStartTick === null && activeEnemies.some((enemy) => enemy.chip.isSettled)) this.battleStartTick = tick;
    if (this.battleStartTick === null) return;

    const participants = [
      ...heroes.filter((hero) => hero.currentArea === 'battle' && !hero.targetArea && isOnBoard(this.board, hero) && hero.chip.isSettled),
      ...activeEnemies.filter((enemy) => enemy.chip.isSettled),
    ];
    participants.forEach((actor) => this.updateActor(actor, participants, tickDelta));
    if (enemies.every((enemy) => !isOnBoard(this.board, enemy)) && this.defeatTick === null) this.defeatTick = tick;
    heroes.forEach((hero) => this.returnSystem?.update(hero));
  }

  updateActor(actor, participants, tickDelta) {
    if (!isOnBoard(this.board, actor)) return;
    const maximum = actionGaugeMaximum(actor);
    actor.chip.actionGaugeMaximum = maximum;
    actor.chip.actionGauge = (actor.chip.actionGauge ?? 0) + actionGaugeRate(actor) * tickDelta;
    if (actor.chip.actionGauge < maximum) return;
    actor.chip.actionGauge = 0;

    const target = this.findTarget(actor, participants);
    if (!target) return;
    this.resolveAction(actor, target);
  }

  findTarget(actor, participants) {
    const candidates = participants.filter((candidate) => isHero(candidate) !== isHero(actor) && isOnBoard(this.board, candidate));
    const inFront = candidates.filter((candidate) => Math.abs(candidate.chip.x - actor.chip.x) < 1);
    const targetSet = inFront.length > 0 ? inFront : candidates;
    return targetSet.toSorted((left, right) => {
      const leftDistance = Math.hypot(left.chip.x - actor.chip.x, left.chip.y - actor.chip.y);
      const rightDistance = Math.hypot(right.chip.x - actor.chip.x, right.chip.y - actor.chip.y);
      return leftDistance - rightDistance || left.chip.x - right.chip.x;
    })[0] ?? null;
  }

  resolveAction(actor, target) {
    for (const attackType of this.getAttackTypes(actor)) {
      if (!isOnBoard(this.board, target)) break;
      const attack = ATTACKS[attackType];
      const damage = getAttackDamage(actor, attack);
      this.applyDamage(actor, target, attackType, damage);
    }
  }

  getAttackTypes(actor) {
    const weapons = isHero(actor)
      ? [actor.equipment.rightHand, actor.equipment.leftHand].filter((item) => item?.category === 'weapon').map((item) => item.type)
      : actor.equipment.filter((item) => item.category === 'weapon').slice(0, 2).map((item) => item.type);
    return [...weapons, ...Array.from({ length: Math.max(0, 2 - weapons.length) }, () => 'unarmed')];
  }

  applyDamage(actor, target, attackType, damage) {
    if (isHero(target)) {
      target.stamina = Math.max(0, target.stamina - damage);
      this.logDamage(actor, target, attackType, damage, `スタミナ ${target.stamina.toFixed(2)}`);
      if (target.stamina === 0) this.returnSystem?.begin(target);
      return;
    }
    target.hp = Math.max(0, target.hp - damage);
    this.logDamage(actor, target, attackType, damage, `HP ${target.hp.toFixed(2)}/${target.maximumHp}`);
    if (target.hp === 0) this.defeatEnemy(target);
  }

  logDamage(actor, target, attackType, damage, remaining) {
    const actorLabel = isHero(actor) ? `${actor.profession}・${actor.name.ja}` : `enemy:${actor.definition.id}`;
    const targetLabel = isHero(target) ? `${target.profession}・${target.name.ja}` : `enemy:${target.definition.id}`;
    this.logger?.info?.(`[Battle] ${actorLabel} -> ${targetLabel} | ${attackType} | ${damage.toFixed(3)} damage | ${remaining}`);
  }

  defeatEnemy(enemy) {
    if (!isOnBoard(this.board, enemy)) return;
    this.board.removeChip(enemy.chip);
    this.controller?.remove(enemy);
    this.contributionPoints += enemy.contributionPoints;
    const area = GAME_AREAS.warehouse;
    const drop = this.itemFactory.createBodyItem({
      part: 'head', tags: [enemy.definition.tagAffinity],
      x: area.x + area.width / 2 + (this.random() - 0.5) * 96,
      y: area.y + area.height / 2 + (this.random() - 0.5) * 96,
      random: this.random,
    });
    this.controller?.addToWarehouse(drop);
  }

  getElapsedTicks(currentTick) {
    if (this.battleStartTick === null) return null;
    const endTick = this.defeatTick ?? currentTick;
    return Math.max(0, Math.round(endTick - this.battleStartTick));
  }
}

export { ACTION_GAUGE_BASE_RATE, ACTION_GAUGE_WEIGHT_SCALE, TICKS_PER_SECOND };
