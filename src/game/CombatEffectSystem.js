import { drawFramedTag } from '../chips/ChipRenderer.js';
import { getTagBaseColors, getTagGlyphScales } from './TagCatalog.js';

const ATTACK_DURATION = 0.42;
const HIT_RECOVERY = 0.34;
const TAG_TRANSFER_DURATION = 0.32;
const NIGHT_FAMILIAR_FLIGHT_DURATION = 0.28;
const NIGHT_FAMILIAR_ASSET_PATH = '/assets/effects/night-familiar.png';
const BEWILDERMENT_ASSET_PATH = '/assets/effects/bewilderment-swirl.png';
const BEWILDERMENT_SWIRL_COUNT = 3;

function visualPosition(chip) {
  return {
    x: chip.x + (chip.effectOffsetX ?? 0),
    y: chip.y - chip.height + (chip.effectOffsetY ?? 0),
  };
}

export default class CombatEffectSystem {
  constructor({ textRepository = null } = {}) {
    this.textRepository = textRepository;
    this.attacks = [];
    this.hits = [];
    this.popups = [];
    this.lightning = [];
    this.tagTransfers = [];
    this.nightFamiliars = new Map();
    this.bewildered = new Set();
    this.nightFamiliarFlights = [];
    this.elapsedSeconds = 0;
    this.actionResults = null;
  }

  beginAction() {
    this.actionResults = new Map();
  }

  endAction() {
    if (!this.actionResults) return;
    this.actionResults.forEach(({ target, amount, priority, lightning }) => {
      if (priority === 'miss') this.emitMiss(target);
      else this.emitDamage(target, amount, priority === 'critical', lightning);
    });
    this.actionResults = null;
  }

  attack(actor, rangeLevel, { showGaugeAtMaximum = true } = {}) {
    if (showGaugeAtMaximum) actor.chip.actionVisualCount = (actor.chip.actionVisualCount ?? 0) + 1;
    this.attacks.push({ chip: actor.chip, elapsed: 0, rangeLevel, showGaugeAtMaximum });
  }

  miss(target) {
    if (this.actionResults) {
      const current = this.getActionResult(target);
      if (current.priority === null) current.priority = 'miss';
      return;
    }
    this.emitMiss(target);
  }

  damage(target, amount, critical = false) {
    if (amount < 0.01) return;
    if (this.actionResults) {
      const current = this.getActionResult(target);
      current.amount += amount;
      current.priority = critical ? 'critical' : current.priority === 'critical' ? 'critical' : 'damage';
      return;
    }
    this.emitDamage(target, amount, critical);
  }

  lightningHit(target) {
    if (this.actionResults) {
      this.getActionResult(target).lightning = true;
      return;
    }
    this.hits.push({ chip: target.chip, elapsed: 0, amount: 0, lightning: true });
  }

  getActionResult(target) {
    if (!this.actionResults.has(target.chip)) this.actionResults.set(target.chip, { target, amount: 0, priority: null, lightning: false });
    return this.actionResults.get(target.chip);
  }

  emitMiss(target) {
    this.popups.push({ chip: target.chip, key: 'combatMiss', values: {}, color: '#dce5f2', elapsed: 0, duration: 0.8 });
  }

  emitDamage(target, amount, critical, lightning = false) {
    this.hits.push({ chip: target.chip, elapsed: 0, amount, lightning });
    this.popups.push({ chip: target.chip, key: critical ? 'combatCritical' : 'combatDamage', values: { amount: Math.round(amount * 100) }, color: critical ? '#ffd365' : '#f6f0d8', elapsed: 0, duration: 0.9 });
  }

  lightningPropagation(from, to) {
    this.lightning.push({ from: from.chip, to: to.chip, elapsed: 0, duration: 0.22 });
  }

  tagTransfer(from, to, tag) {
    this.tagTransfers.push({ from: from.chip, to: to.chip, tag, elapsed: 0, duration: TAG_TRANSFER_DURATION });
  }

  bewilder(combatant) { this.bewildered.add(combatant.chip); }

  clearBewilderment(combatant) { this.bewildered.delete(combatant.chip); }

  summonNightFamiliars(source, count) {
    this.nightFamiliars.set(source.chip, { source: source.chip, count, appearedAt: this.elapsedSeconds });
  }

  removeNightFamiliar(source) {
    const familiars = this.nightFamiliars.get(source.chip);
    if (!familiars) return;
    if (familiars.count <= 1) this.nightFamiliars.delete(source.chip);
    else familiars.count -= 1;
  }

  consumeNightFamiliars(source) {
    this.nightFamiliars.delete(source.chip);
  }

  clearNightFamiliars(source = null) {
    if (source) this.nightFamiliars.delete(source.chip);
    else this.nightFamiliars.clear();
    this.nightFamiliarFlights = source
      ? this.nightFamiliarFlights.filter((effect) => effect.source !== source.chip)
      : [];
  }

  launchNightFamiliar(source, target, index, count) {
    this.nightFamiliarFlights.push({ source: source.chip, target: target.chip, index, count, elapsed: 0 });
  }

  update(deltaSeconds) {
    this.elapsedSeconds += deltaSeconds;
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
      if (effect.showGaugeAtMaximum) effect.chip.actionVisualCount = Math.max(0, (effect.chip.actionVisualCount ?? 1) - 1);
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
    this.tagTransfers.forEach((effect) => { effect.elapsed += deltaSeconds; });
    this.tagTransfers = this.tagTransfers.filter((effect) => effect.elapsed < effect.duration);
    this.nightFamiliarFlights.forEach((effect) => { effect.elapsed += deltaSeconds; });
    this.nightFamiliarFlights = this.nightFamiliarFlights.filter((effect) => effect.elapsed < NIGHT_FAMILIAR_FLIGHT_DURATION);
  }

  draw(context, assets = null) {
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
    if (assets) this.tagTransfers.forEach((effect) => {
      const from = visualPosition(effect.from);
      const to = visualPosition(effect.to);
      const progress = Math.min(1, effect.elapsed / effect.duration);
      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress - Math.sin(progress * Math.PI) * 34;
      const size = 38 * (1 - progress * 0.12);
      const alpha = progress < 0.82 ? 1 : (1 - progress) / 0.18;
      context.save();
      context.globalAlpha = Math.max(0, alpha);
      context.translate(x, y);
      context.rotate((progress - 0.5) * 0.35);
      drawFramedTag(
        context,
        assets,
        `/assets/tags/${effect.tag}.png`,
        getTagBaseColors([effect.tag])[0],
        getTagGlyphScales([effect.tag])[0],
        0,
        0,
        size,
      );
      context.restore();
    });
    if (assets) {
      this.nightFamiliars.forEach((familiars) => {
        for (let index = 0; index < familiars.count; index += 1) this.drawNightFamiliar(context, assets, this.getNightFamiliarOrbitPosition(familiars, index));
      });
      this.bewildered.forEach((chip) => {
        for (let index = 0; index < BEWILDERMENT_SWIRL_COUNT; index += 1) {
          this.drawEffectSprite(context, assets, BEWILDERMENT_ASSET_PATH, this.getBewildermentSwirlPose(chip, index));
        }
      });
      this.nightFamiliarFlights.forEach((effect) => {
        const progress = Math.min(1, effect.elapsed / NIGHT_FAMILIAR_FLIGHT_DURATION);
        const from = this.getNightFamiliarOrbitPosition({ source: effect.source, count: effect.count, appearedAt: 0 }, effect.index);
        const to = visualPosition(effect.target);
        this.drawNightFamiliar(context, assets, {
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress - Math.sin(progress * Math.PI) * 26,
          size: from.size * (1 - progress * 0.2),
          angle: from.angle + progress * 0.6,
        });
      });
    }
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
      const label = this.textRepository ? this.textRepository.getLabel(effect.key, effect.values) : effect.key;
      context.strokeText(label, position.x, y);
      context.fillText(label, position.x, y);
    });
    context.restore();
  }

  getBewildermentSwirlPose(chip, index) {
    const sourcePosition = visualPosition(chip);
    const pulse = 0.88 + Math.sin(this.elapsedSeconds * 3.2 + index * 2.1) * 0.17;
    const phase = this.elapsedSeconds * 2.4 + index * Math.PI * 2 / BEWILDERMENT_SWIRL_COUNT;
    const orbitRadius = chip.radius * pulse;
    const size = Math.max(28, chip.radius * 0.58);
    const pivot = size * 0.22;
    const pivotAngle = index * 2.3;
    return {
      x: sourcePosition.x + Math.cos(phase) * orbitRadius,
      y: sourcePosition.y + Math.sin(phase) * orbitRadius * 0.54 - chip.radius * 0.15,
      size,
      angle: this.elapsedSeconds * (index % 2 === 0 ? 5 : -4.2) + index * Math.PI * 2 / BEWILDERMENT_SWIRL_COUNT,
      pivotX: Math.cos(pivotAngle) * pivot,
      pivotY: Math.sin(pivotAngle) * pivot,
    };
  }

  getNightFamiliarOrbitPosition(familiars, index) {
    return this.getOrbitPosition(familiars.source, index, familiars.count, familiars.appearedAt);
  }

  getOrbitPosition(source, index, count, appearedAt) {
    const sourcePosition = visualPosition(source);
    const expand = Math.min(1, (this.elapsedSeconds - appearedAt) / 0.45);
    const phase = this.elapsedSeconds * 4 + index * Math.PI * 2 / count;
    const orbitRadius = source.radius * 1.05 * expand;
    return {
      x: sourcePosition.x + Math.cos(phase) * orbitRadius,
      y: sourcePosition.y + Math.sin(phase) * orbitRadius * 0.54 - source.radius * 0.15,
      size: Math.max(28, source.radius * 0.58),
      angle: Math.sin(phase) * 0.18,
    };
  }

  drawNightFamiliar(context, assets, pose) {
    this.drawEffectSprite(context, assets, NIGHT_FAMILIAR_ASSET_PATH, pose);
  }

  drawEffectSprite(context, assets, path, { x, y, size, angle, pivotX = 0, pivotY = 0 }) {
    const asset = assets.load(path);
    if (!asset.complete || asset.naturalWidth === 0) return;
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.drawImage(asset, -size / 2 + pivotX, -size / 2 + pivotY, size, size);
    context.restore();
  }
}
