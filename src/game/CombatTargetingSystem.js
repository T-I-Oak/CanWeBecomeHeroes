import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';
import { getBattleSlotPosition, getBattleSlotSpan } from './CombatSlot.js';

const RANGE_COEFFICIENTS = Object.freeze([
  Object.freeze([1]),
  Object.freeze([0.6, 0.7, 0.6]),
  Object.freeze([0.7, 0.8, 0.7]),
  Object.freeze([0.5, 0.7, 0.8, 0.7, 0.5]),
  Object.freeze([0.6, 0.8, 0.9, 0.8, 0.6]),
  Object.freeze([0.6, 0.7, 0.8, 0.9, 0.8, 0.7, 0.6]),
  Object.freeze([0.7, 0.8, 0.9, 1, 0.9, 0.8, 0.7]),
  Object.freeze([0.7, 0.8, 0.9, 1, 1, 1, 0.9, 0.8, 0.7]),
]);

const LOWEST_DURABILITY_WEAPONS = Object.freeze(['staff', 'holy-symbol', 'holy-book', 'banner', 'tarot-cards']);

export default class CombatTargetingSystem {
  constructor(board, { isTargetable = () => true, isBewildered = () => false, includeSelfWhenBewildered = false, includeSelfWhenAlone = true } = {}) {
    this.board = board;
    this.isTargetable = isTargetable;
    this.isBewildered = isBewildered;
    this.includeSelfWhenBewildered = includeSelfWhenBewildered;
    this.includeSelfWhenAlone = includeSelfWhenAlone;
  }

  findTarget(actor, participants) {
    let candidates = this.getOpponents(actor, participants);
    const equipment = isHeroCombatant(actor) ? [actor.equipment.rightHand, actor.equipment.leftHand] : actor.equipment;
    const distance = (candidate) => Math.hypot(candidate.chip.x - actor.chip.x, candidate.chip.y - actor.chip.y);
    const narrowCandidates = (weaponType) => {
      if (candidates.length <= 1) return;
      const equipmentTagCount = (candidate) => Object.values(candidate.equipment).reduce((total, item) => total + (item?.tags?.length ?? 0), 0);
      const values = candidates.map((candidate) => {
        const durability = isHeroCombatant(candidate) ? candidate.stamina : candidate.hp;
        if (weaponType === 'sword') return durability;
        if (LOWEST_DURABILITY_WEAPONS.includes(weaponType)) return -durability;
        if (weaponType === 'claw') return equipmentTagCount(candidate);
        if (weaponType === 'orb') return -candidate.getCarriedWeight();
        if (weaponType === 'shield') return -distance(candidate);
        if (weaponType === 'bow') return distance(candidate);
        return null;
      });
      if (values[0] === null) return;
      const best = Math.max(...values);
      candidates = candidates.filter((candidate, index) => values[index] === best);
    };
    equipment.filter((item) => item?.category === 'weapon').forEach((item) => narrowCandidates(item.type));
    return candidates.toSorted((left, right) => distance(left) - distance(right) || left.chip.x - right.chip.x)[0] ?? null;
  }

  getOpponents(actor, participants) {
    const targetsAllies = this.isBewildered(actor);
    const candidates = participants.filter((candidate) => (candidate !== actor || targetsAllies)
      && isHeroCombatant(candidate) === (targetsAllies ? isHeroCombatant(actor) : !isHeroCombatant(actor))
      && !candidate.isPhantomHead && isEntityOnBoard(this.board, candidate) && this.isTargetable(candidate));
    if (targetsAllies && !this.includeSelfWhenBewildered
      && (!this.includeSelfWhenAlone || candidates.some((candidate) => candidate !== actor))) {
      return candidates.filter((candidate) => candidate !== actor);
    }
    return candidates;
  }

  rangeTargets(actor, target, participants) {
    const coefficients = RANGE_COEFFICIENTS[actor.getTagCount('area')];
    const foes = this.getOpponents(actor, participants);
    const lane = this.createRangeLane(actor, foes);
    const targetIndex = lane.indexOf(target);
    const centerIndex = Math.floor(coefficients.length / 2);
    return coefficients
      .map((coefficient, index) => ({ target: lane[targetIndex + index - centerIndex], coefficient }))
      .filter(({ target: candidate }) => candidate);
  }

  createRangeLane(actor, foes) {
    const targetsHeroes = foes.length > 0 ? isHeroCombatant(foes[0])
      : this.isBewildered(actor) ? isHeroCombatant(actor) : !isHeroCombatant(actor);
    const slotCount = targetsHeroes ? 4 : 6;
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
      if (foe) slot += getBattleSlotSpan(foe) - 1;
    }
    return lane;
  }
}

export { RANGE_COEFFICIENTS };
