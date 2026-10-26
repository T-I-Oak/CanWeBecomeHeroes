import Chip from './Chip.js';
import ChipContactPairs from './ChipContactPairs.js';

const GRAVITY = 1800;
const SETTLE_HEIGHT = 0.2;
const GROUND_SEPARATION_SPEED = 360;
const GROUND_CONTACT_EPSILON = 1e-4;
const MOVE_STEP_DURATION_SECONDS = 0.38;
const COLLISION_HEIGHT_RATIO = 0.25;
const IMPACT_LIFT_SCALE = 20;
const hasPhysicalTilt = (chip) => chip.type === 'item';

function canCollideAtHeight(first, second) {
  if (first.rise || second.rise) return false;
  const contactHeight = Math.min(first.radius, second.radius) * COLLISION_HEIGHT_RATIO;
  return Math.abs(first.height - second.height) <= contactHeight;
}

function getCollisionLiftHeight(source, target) {
  const contactHeight = Math.min(source.radius, target.radius) * COLLISION_HEIGHT_RATIO;
  return source.height + contactHeight + 1;
}

export default class ChipBoard {
  constructor({ width, height }) {
    this.width = width;
    this.height = height;
    this.chips = [];
    this.nextId = 1;
    this.overlapLayers = new Map();
    this.renderContacts = new ChipContactPairs();
    this.groundContacts = new ChipContactPairs();
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  add({ type, x, y, weight, centerPath, tagPaths, tagBaseColors = [], tagGlyphScales = [] }) {
    const chip = new Chip({ id: this.nextId++, type, x, y, weight, centerPath, tagPaths, tagBaseColors, tagGlyphScales });
    this.chips.push(chip);
    return chip;
  }

  addChip(chip) {
    chip.id = this.nextId++;
    this.chips.push(chip);
    return chip;
  }

  removeChip(chip) {
    this.chips = this.chips.filter((current) => current !== chip);
  }

  moveTo(chip, x, y, { stepDistance = null, animationStepCount = null } = {}) {
    const target = this.constrainPosition(chip, x, y);
    const distance = Math.hypot(target.x - chip.x, target.y - chip.y);
    const ratio = stepDistance && distance > stepDistance ? stepDistance / distance : 1;
    const targetX = chip.x + (target.x - chip.x) * ratio;
    const targetY = chip.y + (target.y - chip.y) * ratio;
    if (chip.type === 'hero' && targetX !== chip.x) chip.flipped = targetX < chip.x;
    const stepCount = animationStepCount ?? (stepDistance ? 1 : Math.max(2, Math.ceil(distance / (chip.radius * 0.75))));
    chip.step = { startX: chip.x, startY: chip.y, targetX, targetY, elapsed: 0, stepCount };
    return true;
  }

  launchUp(chip, destination = { x: chip.x, y: chip.y }) {
    const height = chip.dropHeight;
    chip.step = null;
    chip.height = 0;
    chip.verticalVelocity = 0;
    chip.rise = { height, startX: chip.x, startY: chip.y, targetX: destination.x, targetY: destination.y, elapsed: 0, duration: Math.sqrt(2 * height / GRAVITY) };
  }

  updateRise(chip, deltaSeconds) {
    const rise = chip.rise;
    rise.elapsed = Math.min(rise.duration, rise.elapsed + deltaSeconds);
    const progress = rise.elapsed / rise.duration;
    chip.x = rise.startX + (rise.targetX - rise.startX) * progress;
    chip.y = rise.startY + (rise.targetY - rise.startY) * progress;
    chip.height = rise.height - GRAVITY * (rise.duration - rise.elapsed) ** 2 / 2;
    if (rise.elapsed >= rise.duration) chip.rise = null;
  }

  update(deltaSeconds) {
    this.chips.forEach((chip) => {
      if (chip.isTransferVisual) return;
      if (chip.rise) this.updateRise(chip, deltaSeconds);
      else this.updateFall(chip, deltaSeconds);
      this.updateStep(chip, deltaSeconds);
      if (hasPhysicalTilt(chip)) {
        chip.tilt += chip.tiltVelocity * deltaSeconds;
        chip.tiltVelocity *= Math.pow(0.001, deltaSeconds);
      } else {
        chip.tiltVelocity = 0;
      }
      chip.impact = Math.max(0, chip.impact - deltaSeconds * 4);
    });
    this.resolveGroundOverlaps(deltaSeconds);
  }

  getRenderChips() {
    this.updateOverlapLayers();
    return this.chips.toSorted((first, second) => this.compareRenderOrder(first, second));
  }

  updateOverlapLayers() {
    const activePairs = new Set();
    const rows = this.renderContacts.begin(this.chips);
    const count = this.chips.length;
    for (let i = 0; i < count; i++) {
      const secondIndices = rows === null ? this.renderContacts.indices : rows.get(i);
      if (!secondIndices) continue;
      const first = this.chips[i];
      for (let offset = rows === null ? i + 1 : 0; offset < secondIndices.length; offset++) {
        const j = secondIndices[offset];
        const second = this.chips[j];
        const dx = second.x - first.x, dy = second.y - first.y;
        const minimum = first.radius + second.radius;
        if (Math.abs(dx) >= minimum || Math.abs(dy) >= minimum || Math.hypot(dx, dy) >= minimum) continue;

        const pairKey = this.getPairKey(first, second);
        activePairs.add(pairKey);
        if (!this.overlapLayers.has(pairKey)) {
          this.overlapLayers.set(pairKey, this.getNaturalTopChip(first, second).id);
        }
        this.renderContacts.record(i, j);
      }
    }
    this.renderContacts.finish();

    this.overlapLayers.forEach((_, pairKey) => {
      if (!activePairs.has(pairKey)) this.overlapLayers.delete(pairKey);
    });
  }

  compareRenderOrder(first, second) {
    if (first.isAbsorbing !== second.isAbsorbing) return first.isAbsorbing ? 1 : -1;
    const fixedTopId = this.overlapLayers.get(this.getPairKey(first, second));
    if (fixedTopId) return first.id === fixedTopId ? 1 : -1;
    return this.getNaturalTopChip(first, second) === first ? 1 : -1;
  }

  getNaturalTopChip(first, second) {
    if (first.height !== second.height) return first.height > second.height ? first : second;
    if (first.y !== second.y) return first.y > second.y ? first : second;
    return first.id > second.id ? first : second;
  }

  getPairKey(first, second) {
    return first.id < second.id ? `${first.id}:${second.id}` : `${second.id}:${first.id}`;
  }

  updateFall(chip, deltaSeconds) {
    if (chip.height <= SETTLE_HEIGHT && Math.abs(chip.verticalVelocity) < 1) {
      chip.height = 0;
      chip.verticalVelocity = 0;
      chip.tiltVelocity = 0;
      return;
    }

    chip.verticalVelocity += GRAVITY * deltaSeconds;
    chip.height -= chip.verticalVelocity * deltaSeconds;
    if (hasPhysicalTilt(chip)) chip.tiltVelocity += (chip.weight / 15) * 7 * deltaSeconds;

    if (chip.height <= 0) {
      const impactVelocity = chip.verticalVelocity;
      chip.height = 0;
      const bounceVelocity = impactVelocity * (0.22 + (15 - chip.weight) * 0.008);
      chip.verticalVelocity = bounceVelocity < 120 ? 0 : -bounceVelocity;
      chip.tiltVelocity = hasPhysicalTilt(chip) && chip.verticalVelocity !== 0 ? chip.tiltVelocity * -0.62 : 0;
      chip.impact = Math.min(1, impactVelocity / 900);
      if (chip.impactOnLanding) {
        chip.impactOnLanding = false;
        this.applyImpact(chip, impactVelocity);
      }
    }
  }

  updateStep(chip, deltaSeconds) {
    if (!chip.step) return;
    const step = chip.step;
    step.elapsed += deltaSeconds;
    const duration = step.stepCount * MOVE_STEP_DURATION_SECONDS;
    const progress = Math.min(1, step.elapsed / duration);
    const steppedProgress = (Math.floor(progress * step.stepCount) + Math.min(1, (progress * step.stepCount) % 1 * 2)) / step.stepCount;
    const nextX = step.startX + (step.targetX - step.startX) * Math.min(1, steppedProgress);
    chip.vx = (nextX - chip.x) / deltaSeconds;
    chip.x = nextX;
    chip.y = step.startY + (step.targetY - step.startY) * Math.min(1, steppedProgress);
    chip.height = Math.max(chip.height, Math.sin(progress * Math.PI * step.stepCount) * chip.radius * 0.12);
    if (hasPhysicalTilt(chip)) chip.tiltVelocity += (step.targetX - step.startX) * 0.00025;
    this.pushOverlaps(chip, chip.radius * 0.22);
    if (progress >= 1) {
      chip.step = null;
      chip.vx = 0;
      if (chip.type === 'hero') chip.flipped = false;
    }
  }

  applyImpact(source, velocity) {
    const strength = (velocity / 1000) * (source.weight / 15);
    this.chips.filter((chip) => chip !== source).forEach((chip) => {
      if (!canCollideAtHeight(source, chip)) return;
      const distance = Math.hypot(source.x - chip.x, source.y - chip.y);
      const reach = source.radius + chip.radius + 70;
      if (distance >= reach) return;
      const ratio = 1 - distance / reach;
      const dx = chip.x - source.x || 1;
      const dy = chip.y - source.y || 1;
      const length = Math.hypot(dx, dy);
      const displacement = strength * ratio * 40;
      const position = this.constrainPosition(chip, chip.x + (dx / length) * displacement, chip.y + (dy / length) * displacement);
      chip.x = position.x;
      chip.y = position.y;
      const liftHeight = Math.max(0, strength * ratio * chip.radius * IMPACT_LIFT_SCALE - chip.height);
      const launchVelocity = Math.sqrt(2 * GRAVITY * liftHeight);
      chip.verticalVelocity = Math.min(chip.verticalVelocity, -launchVelocity);
      chip.impactOnLanding = false;
      if (hasPhysicalTilt(chip)) chip.tiltVelocity += (dx / length) * strength * 3;
    });
  }

  pushOverlaps(source, force) {
    const pendingChips = [{ chip: source, force }];
    const resolvedPairs = new Set();
    const collisionLifts = new Map();

    while (pendingChips.length > 0) {
      const current = pendingChips.shift();
      for (const chip of this.chips) {
        if (chip === current.chip || chip.isPickupTarget) continue;

        const dx = chip.x - current.chip.x || 1;
        const dy = chip.y - current.chip.y || 1;
        const minimum = current.chip.radius + chip.radius;
        if (Math.abs(dx) >= minimum || Math.abs(dy) >= minimum) continue;
        const distance = Math.hypot(dx, dy);
        if (distance >= minimum) continue;
        if (!canCollideAtHeight(current.chip, chip)) continue;
        const pairKey = this.getPairKey(current.chip, chip);
        if (resolvedPairs.has(pairKey)) continue;

        resolvedPairs.add(pairKey);
        const overlap = minimum - distance;
        const position = this.constrainPosition(
          chip,
          chip.x + (dx / distance) * (overlap + current.force),
          chip.y + (dy / distance) * (overlap + current.force),
        );
        chip.x = position.x;
        chip.y = position.y;
        const lift = collisionLifts.get(chip) ?? { height: chip.height, verticalVelocity: chip.verticalVelocity };
        lift.height = Math.max(lift.height, getCollisionLiftHeight(current.chip, chip), current.force * 0.6);
        lift.verticalVelocity = Math.min(lift.verticalVelocity, -current.force * 20);
        collisionLifts.set(chip, lift);
        chip.impactOnLanding = false;
        pendingChips.push({ chip, force: current.force * 0.72 });
      }
    }

    collisionLifts.forEach((lift, chip) => {
      chip.height = lift.height;
      chip.verticalVelocity = lift.verticalVelocity;
    });
  }

  resolveGroundOverlaps(deltaSeconds) {
    const maximumSeparation = GROUND_SEPARATION_SPEED * deltaSeconds;
    const rows = this.groundContacts.begin(this.chips);
    const count = this.chips.length;
    for (let i = 0; i < count; i++) {
      const secondIndices = rows === null ? this.groundContacts.indices : rows.get(i);
      if (!secondIndices) continue;
      const first = this.chips[i];
      for (let offset = rows === null ? i + 1 : 0; offset < secondIndices.length; offset++) {
        const j = secondIndices[offset];
        const second = this.chips[j];
        if (first.rise || second.rise || first.height > 1 || second.height > 1 || first.isPickupTarget || second.isPickupTarget || first.isTransferVisual || second.isTransferVisual) continue;
        const dx = second.x - first.x || 1;
        const dy = second.y - first.y || 1;
        const minimum = first.radius + second.radius;
        if (Math.abs(dx) >= minimum || Math.abs(dy) >= minimum) continue;
        const distance = Math.hypot(dx, dy);
        if (minimum - distance <= GROUND_CONTACT_EPSILON) continue;
        const overlap = Math.min(minimum - distance, maximumSeparation);
        const totalWeight = first.weight + second.weight;
        const firstShare = totalWeight === 0 ? 0.5 : second.weight / totalWeight;
        const secondShare = totalWeight === 0 ? 0.5 : first.weight / totalWeight;
        const firstPosition = this.constrainPosition(first,
          first.x - (dx / distance) * overlap * firstShare, first.y - (dy / distance) * overlap * firstShare);
        const secondPosition = this.constrainPosition(second,
          second.x + (dx / distance) * overlap * secondShare, second.y + (dy / distance) * overlap * secondShare);
        first.x = firstPosition.x; first.y = firstPosition.y;
        second.x = secondPosition.x; second.y = secondPosition.y;
        this.groundContacts.record(i, j);
      }
    }
    this.groundContacts.finish();
  }

  constrainPosition(chip, x, y) {
    const bounds = chip.bounds ?? { x: 0, y: 0, width: this.width, height: this.height };
    return {
      x: Math.max(bounds.x + chip.radius, Math.min(bounds.x + bounds.width - chip.radius, x)),
      y: Math.max(bounds.y + chip.radius, Math.min(bounds.y + bounds.height - chip.radius, y)),
    };
  }
}
