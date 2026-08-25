import { getStatusValue, getTagPaths, getTagWeight } from './TagCatalog.js';
import { getLuckDegree } from './Luck.js';

const DEFAULT_MAXIMUMS = Object.freeze({ power: 7, magic: 7, speed: 7, negotiation: 7, luck: 7 });

export default class Enemy {
  constructor({ definition, tags, chip, maximumHp, contributionPoints, equipment = [], maximums = {}, rank = 'regular', mainTag = definition.tagAffinity, subTags = [] }) {
    this.definition = definition;
    this.nameKey = definition.nameKey;
    this.tags = [...tags];
    this.chip = chip;
    this.maximumHp = maximumHp;
    this.hp = maximumHp;
    this.contributionPoints = contributionPoints;
    this.rank = rank;
    this.mainTag = mainTag;
    this.subTags = [...subTags];
    this.equipment = [...equipment];
    this.maximums = { ...DEFAULT_MAXIMUMS, ...maximums };
    this.currentArea = 'battle';
    this.attributes = { fire: 0, water: 0, lightning: 0 };
    this.attributeSources = { fire: null, water: null, lightning: null };
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
    return Math.floor((count + 1) / 2);
  }

  getLuckDegree() {
    return getLuckDegree({
      luck: this.getStatus('luck'),
      blessingSkillLevel: this.getTagSkillLevel('blessing'),
      fortuneSkillLevel: this.getTagSkillLevel('fortune'),
      currentStamina: this.hp,
      maximumStamina: this.maximumHp,
    });
  }

  getStatus(stat) {
    return getStatusValue(this.getTags(), stat, this.maximums[stat]);
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
    this.chip.physicalDamageReduction = this.physicalDamageReduction;
  }
}
