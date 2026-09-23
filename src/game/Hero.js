import { getEffectiveTagCount, getStatusValue } from './TagCatalog.js';
import { getCarriedWeight } from './CarriedWeight.js';
import { getCharacterStepDistance } from './MovementSettings.js';
import { getLuckDegree } from './Luck.js';
import { fromDurabilityUnits, toDurabilityUnits } from './Durability.js';

export default class Hero {
  constructor({ profession, heroId = profession, tags, chip, stamina = 0, maximums = {} }) {
    this.profession = profession;
    this.heroId = heroId;
    this.tags = tags;
    this.chip = chip;
    this.maximums = { power: 3, magic: 3, speed: 3, negotiation: 3, luck: 3, stamina: 3, ...maximums };
    this.staminaUnits = toDurabilityUnits(stamina);
    this.staminaRecoveryUnitRemainder = 0;
    this.equipment = { head: null, torso: null, rightHand: null, leftHand: null, feet: null };
    this.preparationReturn = chip.bounds && Object.freeze({ x: chip.x, y: chip.y, bounds: { ...chip.bounds } });
    this.targetSlotId = null;
    this.currentSlotId = null;
    this.targetArea = null;
    this.currentArea = 'preparation';
    this.attributes = { fire: 0, water: 0, lightning: 0 };
    this.attributeSources = { fire: null, water: null, lightning: null };
    this.physicalDamageReduction = 0;
    this.luckBonus = 0;
    this.chip.attributeValues = this.attributes;
    this.chip.physicalDamageReduction = this.physicalDamageReduction;
  }

  get stamina() { return fromDurabilityUnits(this.staminaUnits); }

  get maximumStaminaUnits() { return toDurabilityUnits(this.maximums.stamina); }

  set stamina(value) {
    this.staminaUnits = toDurabilityUnits(value);
  }

  recoverStamina(value) {
    const pendingUnits = value * 100 + this.staminaRecoveryUnitRemainder;
    const recoveredUnits = Math.floor(pendingUnits);
    this.staminaRecoveryUnitRemainder = pendingUnits - recoveredUnits;
    this.staminaUnits = Math.min(this.maximumStaminaUnits, this.staminaUnits + recoveredUnits);
    if (this.staminaUnits === this.maximumStaminaUnits) this.staminaRecoveryUnitRemainder = 0;
  }

  equip(item) {
    const slot = ['head', 'torso', 'feet'].includes(item.category)
      ? item.category
      : this.equipment.rightHand ? 'leftHand' : 'rightHand';
    this.equipment[slot] = item;
    this.refreshDerivedValues();
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
    return getLuckDegree({
      luck: this.getStatus('luck'),
      blessingSkillLevel: this.getTagSkillLevel('blessing'),
      fortuneSkillLevel: this.getTagSkillLevel('fortune'),
      currentStamina: this.stamina,
      maximumStamina: this.maximums.stamina,
    });
  }

  getLuckRate() {
    return this.getLuckDegree();
  }

  getTags() {
    return [...this.tags, ...Object.values(this.equipment).flatMap((item) => item?.tags ?? [])];
  }

  getTagCount(tag) {
    return getEffectiveTagCount(this.getTags(), tag, this.maximums);
  }

  getTagSkillLevel(tag) {
    const count = this.getTagCount(tag);
    return Math.floor((count + 1) / 2);
  }

  getCarriedWeight() {
    return getCarriedWeight(this.tags, Object.values(this.equipment));
  }

  getStepDistance() {
    return getCharacterStepDistance(this.getCarriedWeight());
  }

  clearBattleState() {
    this.attributes = { fire: 0, water: 0, lightning: 0 };
    this.attributeSources = { fire: null, water: null, lightning: null };
    this.physicalDamageReduction = 0;
    this.luckBonus = 0;
    this.chip.actionGauge = null;
    this.chip.actionGaugeMaximum = null;
    this.chip.actionGaugeBaseMaximum = null;
    this.chip.tilt = 0;
    this.chip.effectOffsetX = 0;
    this.chip.effectOffsetY = 0;
    this.chip.effectRotation = 0;
    this.chip.attributeValues = this.attributes;
    this.chip.physicalDamageReduction = 0;
  }

  clearEquipment() {
    const equippedItems = Object.values(this.equipment).filter(Boolean);
    Object.keys(this.equipment).forEach((slot) => { this.equipment[slot] = null; });
    this.refreshDerivedValues();
    return equippedItems;
  }

  refreshDerivedValues() { this.chip.weight = this.getCarriedWeight(); }
}
