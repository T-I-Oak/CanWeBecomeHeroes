export const CHIP_RADIUS = Object.freeze({ hero: 96, item: 37.5 });

export default class Chip {
  constructor({ id, type, x, y, weight, centerPath, tagPaths, radius = null, bounds = null, fillColor = '#ffffff', borderColor = '#d7dce4' }) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.radius = radius ?? CHIP_RADIUS[type];
    this.weight = weight;
    this.centerPath = centerPath;
    this.tagPaths = tagPaths;
    this.bounds = bounds;
    this.fillColor = fillColor;
    this.fillColors = null;
    this.borderColor = borderColor;
    this.borderColors = null;
    this.scale = 1;
    this.height = this.radius * 2.8;
    this.verticalVelocity = 0;
    this.tilt = 0;
    this.poseTilt = 0;
    this.tiltVelocity = 0;
    this.step = null;
    this.impact = 0;
    this.storageCount = null;
    this.storageCapacity = null;
    this.actionGauge = null;
    this.actionGaugeMaximum = null;
    this.attributeValues = null;
    this.effectOffsetX = 0;
    this.effectOffsetY = 0;
    this.effectRotation = 0;
  }

  get isSettled() {
    return this.height < 0.2 && Math.abs(this.verticalVelocity) < 1 && !this.step;
  }

  beginDrop() {
    this.baseY = this.y;
    this.scale = 1;
    this.height = this.radius * 2.8;
    this.verticalVelocity = 0;
    this.tilt = 0;
    this.poseTilt = 0;
    this.tiltVelocity = 0;
    this.step = null;
    this.impact = 0;
  }
}
