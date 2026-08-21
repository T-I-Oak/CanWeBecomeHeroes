import { getStatusValue, getTagWeight } from './TagCatalog.js';
import { getHeroStepDistance } from './MovementSettings.js';

export default class Hero {
  constructor({ profession, name, tags, chip, stamina = 0, maximums = {} }) {
    this.profession = profession;
    this.name = name;
    this.tags = tags;
    this.chip = chip;
    this.stamina = stamina;
    this.maximums = { power: 3, magic: 3, speed: 3, negotiation: 3, luck: 3, stamina: 3, ...maximums };
    this.equipment = { head: null, torso: null, rightHand: null, leftHand: null, feet: null };
    this.preparationReturn = chip.bounds && Object.freeze({ x: chip.x, y: chip.y, bounds: { ...chip.bounds } });
    this.targetSlotId = null;
    this.currentSlotId = null;
    this.targetArea = null;
    this.currentArea = 'preparation';
    this.attributes = { fire: 0, water: 0, lightning: 0 };
    this.physicalDamageReduction = 0;
    this.luckBonus = 0;
    this.chip.attributeValues = this.attributes;
  }

  equip(item) {
    const slot = ['head', 'torso', 'feet'].includes(item.category)
      ? item.category
      : this.equipment.rightHand ? 'leftHand' : 'rightHand';
    this.equipment[slot] = item;
    this.chip.weight = getTagWeight(this.getTags());
    return slot;
  }

  canEquip(item) {
    if (['head', 'torso', 'feet'].includes(item.category)) return !this.equipment[item.category];
    const hasFreeHand = !this.equipment.rightHand || !this.equipment.leftHand;
    const hasDestination = [this.equipment.rightHand, this.equipment.leftHand].some((equipped) => equipped?.category === 'destination');
    return hasFreeHand && (item.category !== 'destination' || !hasDestination);
  }

  getStatus(stat) {
    return getStatusValue(this.getTags(), stat, this.maximums[stat]);
  }

  getLuckDegree() {
    return Math.max(0, (5 + this.getStatus('luck') * 10) / 100);
  }

  getLuckRate() {
    return this.getLuckDegree();
  }

  getTags() {
    return [...this.tags, ...Object.values(this.equipment).flatMap((item) => item?.tags ?? [])];
  }

  getTagCount(tag) {
    return Math.min(7, this.getTags().filter((current) => current === tag).length);
  }

  getTagSkillLevel(tag) {
    const count = this.getTagCount(tag);
    return [7, 5, 3, 1].find((level) => count >= level) ?? 0;
  }

  getCarriedWeight() {
    return getTagWeight(this.getTags());
  }

  getStepDistance() {
    return getHeroStepDistance(this.getCarriedWeight());
  }

  clearEquipment() {
    const equippedItems = Object.values(this.equipment).filter(Boolean);
    Object.keys(this.equipment).forEach((slot) => { this.equipment[slot] = null; });
    this.chip.weight = getTagWeight(this.tags);
    return equippedItems;
  }
}
