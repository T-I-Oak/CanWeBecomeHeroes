import { getTagPaths, getTagWeight, TAGS } from './TagCatalog.js';

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
    this.refreshDerivedValues();
  }

  getTags() {
    return [...this.tags, ...this.equipment.flatMap((item) => item.tags ?? [])];
  }

  getTagCount(tag) {
    return this.getTags().filter((current) => current === tag).length;
  }

  getStatus(stat) {
    const count = this.getTags().filter((tag) => TAGS[tag]?.stat === stat).length;
    return Math.min(MAXIMUMS[stat], count);
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
  }
}
