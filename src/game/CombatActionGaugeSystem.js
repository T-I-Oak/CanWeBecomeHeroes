export const ACTION_GAUGE_BASE_RATE = 13 / 300;
export const ACTION_GAUGE_WEIGHT_SCALE = 25;
export const BOW_GAUGE_SHORTENING_PER_WEAPON = 0.1;
export const MAX_BOW_GAUGE_SHORTENING_WEAPONS = 5;

const ACTION_TILT_RECOVERY_RADIANS = Math.PI / 24;

export function getActionGaugeBaseMaximum(actor) { return 15 - actor.getStatus('speed'); }

export function getActionGaugeMaximum(actor) {
  const baseMaximum = getActionGaugeBaseMaximum(actor);
  const equipment = Array.isArray(actor.equipment) ? actor.equipment : Object.values(actor.equipment);
  const bowCount = equipment.filter((item) => item?.category === 'weapon' && item.type === 'bow').length;
  const shortening = Math.min(bowCount, MAX_BOW_GAUGE_SHORTENING_WEAPONS) * BOW_GAUGE_SHORTENING_PER_WEAPON;
  return baseMaximum * (1 - shortening);
}

export default class CombatActionGaugeSystem {
  updateMaximum(actor) {
    const maximum = getActionGaugeMaximum(actor);
    actor.chip.actionGaugeBaseMaximum = getActionGaugeBaseMaximum(actor);
    actor.chip.actionGaugeMaximum = maximum;
    return maximum;
  }

  advance(actor, delta) {
    const maximum = this.updateMaximum(actor);
    actor.chip.actionGauge = (actor.chip.actionGauge ?? 0) + ACTION_GAUGE_BASE_RATE / (1 + (actor.getCarriedWeight() / ACTION_GAUGE_WEIGHT_SCALE) ** 2) * delta;
    if (actor.chip.actionGauge < maximum) return false;
    actor.chip.actionGauge = 0;
    this.restoreTilt(actor);
    return true;
  }

  stealCurrentGauge(recipient, opponents, rate) {
    const stolen = opponents.reduce((total, opponent) => {
      const current = Math.max(0, opponent.chip.actionGauge ?? 0);
      const amount = current * rate;
      opponent.chip.actionGauge = current - amount;
      return total + amount;
    }, 0);
    recipient.chip.actionGauge = Math.max(0, recipient.chip.actionGauge ?? 0) + stolen;
    return stolen;
  }

  restoreTilt(actor) {
    const { chip } = actor;
    if (Math.abs(chip.tilt) <= ACTION_TILT_RECOVERY_RADIANS) {
      chip.tilt = 0;
      return;
    }
    chip.tilt -= Math.sign(chip.tilt) * ACTION_TILT_RECOVERY_RADIANS;
  }
}
