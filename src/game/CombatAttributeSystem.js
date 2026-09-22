import { GAME_TICKS_PER_SECOND } from './GameClock.js';
import { getCombatRandomModifier } from './CombatRandom.js';
import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';
import { getBattleSlotPosition } from './CombatSlot.js';

const ATTRIBUTE_TICK_INTERVAL = GAME_TICKS_PER_SECOND;
const ATTRIBUTE_KEYS = Object.freeze(['fire', 'water', 'lightning']);

export default class CombatAttributeSystem {
  constructor({ board, effects = null, random = Math.random, applyDamage, isTargetable = () => true, resolveAttributeReactions = () => [] }) {
    Object.assign(this, { board, effects, random, applyDamage, isTargetable, resolveAttributeReactions });
    this.elapsedTicks = 0;
  }

  reset() { this.elapsedTicks = 0; }

  update(participants, delta) {
    this.elapsedTicks += delta;
    while (this.elapsedTicks >= ATTRIBUTE_TICK_INTERVAL) {
      this.elapsedTicks -= ATTRIBUTE_TICK_INTERVAL;
      participants.forEach((actor) => this.decay(actor));
    }
  }

  decay(actor) {
    const attributes = actor.attributes;
    if (attributes.fire > 0) this.applyDamage(actor.attributeSources?.fire ?? null, actor, 'fire', attributes.fire * 0.1 * (1 - actor.getTagSkillLevel('cloth') * 0.1));
    ATTRIBUTE_KEYS.forEach((key) => { attributes[key] = Math.max(0, attributes[key] * 0.95 - 0.1); });
    actor.chip.attributeValues = attributes;
  }

  applyAttributes(actor, target, coefficient) {
    ATTRIBUTE_KEYS.forEach((tag) => {
      const tagCount = actor.getTagCount(tag);
      if (!tagCount) return;
      const luckDegree = Math.max(0, actor.getLuckDegree());
      const applicationRate = luckDegree > 0 ? 1 - Math.min(this.random() / luckDegree, 1) : 0;
      const value = tagCount * coefficient * applicationRate * getCombatRandomModifier(this.random);
      this.applyAttribute(actor, target, tag, value);
    });
  }

  applyAttribute(actor, target, attribute, value) {
    const previousValue = target.attributes[attribute];
    if (value <= previousValue) return false;
    const reactions = this.resolveAttributeReactions(Object.freeze({ actor, target, attribute, value, previousValue }));
    const reductionRate = Math.max(0, ...reactions.map((reaction) => reaction.reductionRate));
    const reflectedValue = value * reductionRate;
    const remainingValue = value - reflectedValue;
    this.assignAttribute(target, attribute, Math.max(previousValue, remainingValue), actor);
    if (reflectedValue > 0) this.assignAttribute(actor, attribute, reflectedValue, target);
    return true;
  }

  assignAttribute(target, attribute, value, source) {
    if (value > target.attributes[attribute]) {
      target.attributes[attribute] = value;
      target.attributeSources[attribute] = source;
    }
    target.chip.attributeValues = target.attributes;
  }

  getLightningTargets(target, participants, value) {
    const targetSlotPosition = getBattleSlotPosition(target);
    if (targetSlotPosition === null) return [];
    const opponentsBySlot = new Map(participants
      .filter((candidate) => candidate !== target && isHeroCombatant(candidate) === isHeroCombatant(target) && isEntityOnBoard(this.board, candidate) && this.isTargetable(candidate))
      .map((candidate) => [getBattleSlotPosition(candidate), candidate])
      .filter(([slotPosition]) => slotPosition !== null));
    return [-1, 1].flatMap((direction) => {
      const targets = [];
      for (let distance = 1; distance <= Math.floor(value); distance += 1) {
        const candidate = opponentsBySlot.get(targetSlotPosition + direction * distance);
        if (!candidate) break;
        targets.push({ target: candidate, distance });
      }
      return targets;
    }).toSorted((first, second) => first.distance - second.distance || first.target.chip.x - second.target.chip.x);
  }

  propagate(actor, target, type, damage, participants) {
    const value = target.attributes.lightning;
    if (!value || damage < 0.01) return;
    this.getLightningTargets(target, participants, value).forEach(({ target: other, distance }) => {
      const dealt = damage * (1 - target.getTagSkillLevel('cloth') * 0.1) * (value * 0.1 + 0.3) ** distance;
      this.effects?.lightningPropagation(target, other);
      this.effects?.lightningHit(other);
      this.applyDamage(actor, other, type, dealt, false);
    });
  }
}
