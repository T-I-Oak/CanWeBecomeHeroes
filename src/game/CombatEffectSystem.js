const ATTACK_DURATION = 0.42;
const HIT_RECOVERY = 0.34;

function visualPosition(chip) {
  return {
    x: chip.x + (chip.effectOffsetX ?? 0),
    y: chip.y - chip.height + (chip.effectOffsetY ?? 0),
  };
}

export default class CombatEffectSystem {
  constructor() {
    this.attacks = [];
    this.hits = [];
    this.popups = [];
    this.lightning = [];
  }

  attack(actor, rangeLevel) {
    this.attacks.push({ chip: actor.chip, elapsed: 0, rangeLevel });
  }

  miss(target) {
    this.popups.push({ chip: target.chip, label: 'miss!', color: '#dce5f2', elapsed: 0, duration: 0.8 });
  }

  damage(target, amount, critical = false) {
    if (amount < 0.01) return;
    this.hits.push({ chip: target.chip, elapsed: 0, amount, lightning: false });
    this.popups.push({ chip: target.chip, label: `${critical ? 'critical' : 'damage'} ${Math.round(amount * 100)}`, color: critical ? '#ffd365' : '#f6f0d8', elapsed: 0, duration: 0.9 });
  }

  lightningHit(target) {
    this.hits.push({ chip: target.chip, elapsed: 0, amount: 0, lightning: true });
  }

  lightningPropagation(from, to) {
    this.lightning.push({ from: from.chip, to: to.chip, elapsed: 0, duration: 0.22 });
  }

  update(deltaSeconds) {
    this.attacks = this.attacks.filter((effect) => {
      effect.elapsed += deltaSeconds;
      const ratio = Math.min(1, effect.elapsed / ATTACK_DURATION);
      const angle = ratio * Math.PI * 2;
      const horizontalRadius = 10 + effect.rangeLevel * 5;
      const verticalRadius = 12;
      const enemy = effect.chip.type === 'enemy';
      effect.chip.effectOffsetX = (enemy ? -1 : 1) * Math.sin(angle) * horizontalRadius;
      effect.chip.effectOffsetY = (enemy ? 1 : -1) * (1 - Math.cos(angle)) * verticalRadius;
      if (ratio < 1) return true;
      effect.chip.effectOffsetX = 0;
      effect.chip.effectOffsetY = 0;
      return false;
    });
    this.hits = this.hits.filter((effect) => {
      effect.elapsed += deltaSeconds;
      const ratio = Math.min(1, effect.elapsed / HIT_RECOVERY);
      if (effect.lightning) {
        effect.chip.effectOffsetX = 0;
        effect.chip.effectOffsetY = 0;
        effect.chip.effectRotation = Math.sin(ratio * Math.PI) * 0.12;
      } else {
        const direction = effect.chip.type === 'hero' ? 1 : -1;
        const distance = Math.min(28, effect.amount * 48);
        effect.chip.effectOffsetY = direction * Math.sin(ratio * Math.PI) * distance;
        effect.chip.effectRotation = direction * Math.sin(ratio * Math.PI) * Math.min(0.16, effect.amount * 0.16);
      }
      if (ratio < 1) return true;
      effect.chip.effectOffsetX = 0;
      effect.chip.effectOffsetY = 0;
      effect.chip.effectRotation = 0;
      return false;
    });
    this.popups.forEach((effect) => { effect.elapsed += deltaSeconds; });
    this.popups = this.popups.filter((effect) => effect.elapsed < effect.duration);
    this.lightning.forEach((effect) => { effect.elapsed += deltaSeconds; });
    this.lightning = this.lightning.filter((effect) => effect.elapsed < effect.duration);
  }

  draw(context) {
    context.save();
    this.lightning.forEach((effect) => {
      const from = visualPosition(effect.from);
      const to = visualPosition(effect.to);
      const progress = effect.elapsed / effect.duration;
      context.strokeStyle = `rgba(255, 227, 103, ${1 - progress})`;
      context.shadowColor = '#9d62ff';
      context.shadowBlur = 10;
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(from.x, from.y);
      const steps = 6;
      for (let index = 1; index < steps; index += 1) {
        const ratio = index / steps;
        const x = from.x + (to.x - from.x) * ratio;
        const y = from.y + (to.y - from.y) * ratio + Math.sin(index * 7 + effect.elapsed * 40) * 12;
        context.lineTo(x, y);
      }
      context.lineTo(to.x, to.y);
      context.stroke();
    });
    this.popups.forEach((effect) => {
      const position = visualPosition(effect.chip);
      const ratio = effect.elapsed / effect.duration;
      context.globalAlpha = 1 - ratio;
      context.fillStyle = effect.color;
      context.strokeStyle = '#24334d';
      context.lineWidth = 6;
      context.font = 'bold 40px system-ui';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const y = position.y - effect.chip.radius - ratio * 22;
      context.strokeText(effect.label, position.x, y);
      context.fillText(effect.label, position.x, y);
    });
    context.restore();
  }
}
