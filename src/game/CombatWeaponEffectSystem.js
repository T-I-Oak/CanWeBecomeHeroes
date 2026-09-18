import { getTagBaseColors, getTagGlyphScales, getTagPaths, getTagValue, getTagWeight } from './TagCatalog.js';
import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';
import { getActionGaugeBaseMaximum } from './CombatActionGaugeSystem.js';

const ATTRIBUTE_KEYS = Object.freeze(['fire', 'water', 'lightning']);

export default class CombatWeaponEffectSystem {
  constructor({ board, controller, damageSystem, effects = null, getWarehouseDropPosition, random = Math.random, actionGaugeSystem }) {
    Object.assign(this, { board, controller, damageSystem, effects, getWarehouseDropPosition, random, actionGaugeSystem });
  }

  applySupportEffect(actor, type, participants) {
    if (type === 'shield') this.applyShield(actor, participants);
    if (type === 'holy-book') this.applyHolyBook(actor, participants);
    if (type === 'banner') this.applyBanner(actor, participants);
    if (type === 'holy-symbol') this.applyHolySymbol(actor, participants);
    if (type === 'tarot-cards') this.applyTarotCards(actor, participants);
  }

  applyShield(actor, participants) {
    const reduction = actor.getTagCount('iron') * 0.1 + 0.05;
    participants.filter((candidate) => isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      this.damageSystem.setPhysicalDamageReduction(ally, Math.max(ally.physicalDamageReduction, reduction));
    });
  }

  applyHolyBook(actor, participants) {
    const reduction = actor.getTagCount('cloth') * 0.05 + 0.025;
    participants.filter((candidate) => isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      ATTRIBUTE_KEYS.forEach((attribute) => { ally.attributes[attribute] *= 1 - reduction; });
      ally.chip.attributeValues = ally.attributes;
    });
  }

  applyBanner(actor, participants) {
    const gaugeIncrease = actor.getTagCount('reputation') * 0.05 + 0.025;
    participants.filter((candidate) => candidate !== actor && isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      ally.chip.actionGauge = (ally.chip.actionGauge ?? 0) + getActionGaugeBaseMaximum(ally) * gaugeIncrease;
    });
  }

  applyHolySymbol(actor, participants) {
    const recovery = actor.getTagCount('blessing') * 0.05 + 0.05;
    participants.filter((candidate) => candidate !== actor && isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      if (isHeroCombatant(ally)) ally.stamina = Math.min(ally.maximums.stamina, ally.stamina + recovery);
      else ally.hp = Math.min(ally.maximumHp, ally.hp + recovery);
    });
  }

  applyTarotCards(actor, participants) {
    const bonus = actor.getTagCount('fortune') * 0.1 + 0.05;
    participants.filter((candidate) => candidate !== actor && isHeroCombatant(candidate) === isHeroCombatant(actor)).forEach((ally) => {
      ally.luckBonus = Math.max(ally.luckBonus, bonus);
    });
  }

  applyOrb(actor, target, coefficient) {
    if (this.random() >= (actor.getLuckDegree() + 0.3) * coefficient) return;
    const items = (isHeroCombatant(target) ? Object.values(target.equipment) : target.equipment).filter((item) => item && item.tags.length < 3);
    const item = items[Math.floor(this.random() * items.length)];
    if (!item?.addTag('gem')) return;
    item.chip.weight = getTagWeight(item.tags);
    item.chip.tagPaths = getTagPaths(item.tags);
    item.chip.tagBaseColors = getTagBaseColors(item.tags);
    item.chip.tagGlyphScales = getTagGlyphScales(item.tags);
    item.value = getTagValue(item.tags);
    target.refreshDerivedValues?.();
    this.effects?.tagTransfer(actor, target, 'gem');
  }

  getTheftCandidates(target) {
    if (!isHeroCombatant(target)) return target.equipment;
    return [...(this.controller?.entities?.values?.() ?? [])].filter((entity) => entity.chip.type === 'item' && !entity.isStored && entity.category !== 'destination' && isEntityOnBoard(this.board, entity));
  }

  resolveTheft(actor, target) {
    const candidates = this.getTheftCandidates(target);
    const skillLevel = actor.getTagSkillLevel('dexterity');
    for (let tagCount = 3; tagCount >= 0; tagCount -= 1) {
      if (!candidates.some((item) => item.tags.length >= tagCount) || skillLevel < tagCount) continue;
      const eligibleCandidates = candidates.filter((item) => item.tags.length <= tagCount);
      if (eligibleCandidates.length === 0 || this.random() >= actor.getLuckDegree() * (skillLevel - tagCount + 1) * 0.2) continue;
      const maximumTagCount = Math.max(...eligibleCandidates.map((item) => item.tags.length));
      const choices = eligibleCandidates.filter((item) => item.tags.length === maximumTagCount);
      const item = choices[Math.floor(this.random() * choices.length)];
      this.transferStolenItem(actor, target, item);
      return item;
    }
    return null;
  }

  transferStolenItem(actor, target, item) {
    if (isHeroCombatant(actor)) {
      target.removeEquipment(item);
      this.actionGaugeSystem.updateMaximum(target);
      const destination = this.getWarehouseDropPosition();
      const completeTransfer = () => {
        item.chip.x = destination.x;
        item.chip.y = destination.y;
        item.chip.scale = 1;
        this.controller?.addToWarehouse?.(item);
      };
      const animated = this.controller?.animateItemTransfer?.(item, { from: { x: target.chip.x, y: target.chip.y }, to: destination, onComplete: completeTransfer });
      if (!animated) completeTransfer();
      return;
    }
    const source = { x: item.chip.x, y: item.chip.y };
    this.controller?.remove?.(item);
    const recipient = actor.projectionSource ?? actor;
    recipient.addEquipment(item);
    this.actionGaugeSystem.updateMaximum(recipient);
    this.controller?.animateItemTransfer?.(item, { from: source, to: { x: actor.chip.x, y: actor.chip.y } });
  }
}
