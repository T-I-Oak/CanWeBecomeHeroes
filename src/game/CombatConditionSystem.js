const BASE_CRITICAL_DAMAGE_MULTIPLIER = 1;

export default class CombatConditionSystem {
  constructor({ effects = null } = {}) {
    this.effects = effects;
    this.trackedCombatants = new Set();
    this.twoEdgedSwordMultipliers = new WeakMap();
    this.nightFamiliarCounts = new WeakMap();
    this.bewilderedCombatants = new WeakMap();
    this.misfortuneDamageRates = new WeakMap();
  }

  reset() {
    const combatants = [...this.trackedCombatants];
    this.trackedCombatants = new Set();
    this.twoEdgedSwordMultipliers = new WeakMap();
    this.nightFamiliarCounts = new WeakMap();
    this.bewilderedCombatants = new WeakMap();
    this.misfortuneDamageRates = new WeakMap();
    combatants.forEach((combatant) => this.writeChip(combatant));
  }

  clearCombatant(combatant) {
    this.clearTwoEdgedSword(combatant);
    this.nightFamiliarCounts.delete(combatant);
    this.clearBewilderment(combatant);
    this.misfortuneDamageRates.delete(combatant);
    this.writeChip(combatant);
  }

  writeChip(combatant) {
    const chip = combatant?.chip;
    if (!chip) return;
    const multiplier = this.twoEdgedSwordMultipliers.get(combatant);
    chip.twoEdgedSwordMultiplier = multiplier > 1 ? multiplier : 0;
    chip.bewildered = this.bewilderedCombatants.has(combatant);
    chip.bewildermentLevel = this.getBewildermentLevel(combatant);
    chip.misfortuneDamageRate = this.misfortuneDamageRates.get(combatant) ?? 0;
    chip.nightFamiliarCount = this.nightFamiliarCounts.get(combatant) ?? 0;
  }

  track(combatant) {
    this.trackedCombatants.add(combatant);
    this.writeChip(combatant);
  }

  applyTwoEdgedSword(combatant, multiplier) {
    const currentMultiplier = this.getTwoEdgedSwordMultiplier(combatant);
    this.twoEdgedSwordMultipliers.set(combatant, Math.max(currentMultiplier, multiplier));
    this.track(combatant);
  }

  clearTwoEdgedSword(combatant) {
    this.twoEdgedSwordMultipliers.delete(combatant);
    this.track(combatant);
  }

  getTwoEdgedSwordMultiplier(combatant) {
    return this.twoEdgedSwordMultipliers.get(combatant) ?? BASE_CRITICAL_DAMAGE_MULTIPLIER;
  }

  getCriticalDamageMultiplier(attacker, target) {
    return Math.max(
      this.getTwoEdgedSwordMultiplier(attacker),
      this.getTwoEdgedSwordMultiplier(target),
    );
  }

  summonNightFamiliars(combatant, count) {
    this.nightFamiliarCounts.set(combatant, count);
    this.track(combatant);
  }

  getNightFamiliarCount(combatant) {
    return this.nightFamiliarCounts.get(combatant) ?? 0;
  }

  consumeNightFamiliars(combatant) {
    const count = this.getNightFamiliarCount(combatant);
    this.nightFamiliarCounts.delete(combatant);
    this.track(combatant);
    return count;
  }

  removeNightFamiliar(combatant) {
    const count = this.getNightFamiliarCount(combatant);
    if (count === 0) return false;
    if (count === 1) this.nightFamiliarCounts.delete(combatant);
    else this.nightFamiliarCounts.set(combatant, count - 1);
    this.track(combatant);
    return true;
  }

  applyBewilderment(combatant, level = 1) {
    this.bewilderedCombatants.set(combatant, Math.max(level, this.getBewildermentLevel(combatant)));
    this.effects?.bewilder(combatant);
    this.track(combatant);
  }

  clearBewilderment(combatant) {
    if (!this.bewilderedCombatants.has(combatant)) return;
    this.bewilderedCombatants.delete(combatant);
    this.effects?.clearBewilderment(combatant);
    this.track(combatant);
  }

  hasBewilderment(combatant) { return this.bewilderedCombatants.has(combatant); }

  getBewildermentLevel(combatant) { return this.bewilderedCombatants.get(combatant) ?? 0; }

  applyMisfortune(combatant, damageRate) {
    this.misfortuneDamageRates.set(combatant, damageRate);
    this.track(combatant);
  }

  clearMisfortune(combatant) {
    this.misfortuneDamageRates.delete(combatant);
    this.track(combatant);
  }

  getMisfortuneDamageRate(combatant) { return this.misfortuneDamageRates.get(combatant) ?? 0; }
}
