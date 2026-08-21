import { getStatusValue, getTagPaths, getTagWeight } from './TagCatalog.js';

const MAXIMUMS = Object.freeze({ power: 7, magic: 7, speed: 7, negotiation: 7, luck: 7 });

export default class Enemy {
  constructor({ definition, tags, chip, maximumHp, contributionPoints, equipment = [] }) {
    this.definition = definition;
    this.nameKey = definition.nameKey;
    this.tags = [...tags];
    this.chip = chip;
    this.maximumHp = maximumHp;
    this.hp = maximumHp;
    this.contributionPoints = contributionPoints;
    this.equipment = [...equipment];
    this.currentArea = 'battle';
    this.attributes = { fire: 0, water: 0, lightning: 0 };
    this.physicalDamageReduction = 0;
    this.luckBonus = 0;
    this.refreshDerivedValues();
  }

  getTags() {
    return [...this.tags, ...this.equipment.flatMap((item) => item.tags ?? [])];
  }

  getTagCount(tag) {
    return Math.min(7, this.getTags().filter((current) => current === tag).length);
  }

  getTagSkillLevel(tag) {
    const count = this.getTagCount(tag);
    return [7, 5, 3, 1].find((level) => count >= level) ?? 0;
  }

  getLuckDegree() {
    return Math.max(0, (5 + this.getStatus('luck') * 10) / 100);
  }

  getStatus(stat) {
    return getStatusValue(this.getTags(), stat, MAXIMUMS[stat]);
  }

  getCarriedWeight() {
    return getTagWeight(this.getTags());
  }

  removeEquipment(item) {
    const index = this.equipment.indexOf(item);
    if (index < 0) return false;
    this.equipment.splice(index, 1);
    this.refreshDerivedValues();
    return true;
  }

  addEquipment(item) {
    this.equipment.push(item);
    this.refreshDerivedValues();
  }

  refreshDerivedValues() {
    const tags = this.getTags();
    this.chip.weight = getTagWeight(tags);
    this.chip.tagPaths = getTagPaths(this.tags);
    this.chip.attributeValues = this.attributes;
  }
}
