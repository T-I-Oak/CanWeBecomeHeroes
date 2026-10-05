export default class Camera {
  constructor(world, { minZoom = 0.5, maxZoom = 1.5, padding = 200 } = {}) {
    this.world = world;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.padding = padding;
    this.zoom = minZoom;
    this.viewport = null;
    this.x = -padding;
    this.y = -padding;
  }

  setViewport(width, height) {
    const previousCenter = this.viewport
      ? this.toWorld(this.viewport.width / 2, this.viewport.height / 2)
      : null;
    const previousMinZoom = this.viewport ? this.getEffectiveMinZoom() : null;
    const wasAtMin = previousMinZoom !== null && (this.zoom <= previousMinZoom + 1e-4);
    this.viewport = { width, height };
    const newMinZoom = this.getEffectiveMinZoom();

    if (previousMinZoom === null || wasAtMin) {
      this.zoom = newMinZoom;
    } else {
      this.zoom = Math.max(newMinZoom, Math.min(this.maxZoom, this.zoom));
    }
    if (previousCenter) this.centerOnWorldPoint(previousCenter);
    else this.setPointer(width / 2, height / 2);
  }

  getEffectiveMinZoom() {
    if (!this.viewport) return this.minZoom;
    const totalWidth = this.world.width + this.padding * 2;
    const totalHeight = this.world.height + this.padding * 2;
    const fitZoom = Math.min(
      this.viewport.width / totalWidth,
      this.viewport.height / totalHeight
    );
    return Math.min(this.maxZoom, fitZoom);
  }

  fitToScreen() {
    if (this.viewport) {
      this.zoom = this.getEffectiveMinZoom();
      this.setPointer(this.viewport.width / 2, this.viewport.height / 2);
    }
  }

  getRange(dimension, viewportSize) {
    const visibleSize = viewportSize / this.zoom;
    const totalSize = this.world[dimension] + this.padding * 2;
    if (visibleSize >= totalSize) {
      const center = (this.world[dimension] - visibleSize) / 2;
      return { min: center, max: center };
    }
    return {
      min: -this.padding,
      max: this.world[dimension] + this.padding - visibleSize,
    };
  }

  setPointer(x, y) {
    const rangeX = this.getRange('width', this.viewport.width);
    const rangeY = this.getRange('height', this.viewport.height);
    this.x = rangeX.min === rangeX.max ? rangeX.min : rangeX.min + (x / this.viewport.width) * (rangeX.max - rangeX.min);
    this.y = rangeY.min === rangeY.max ? rangeY.min : rangeY.min + (y / this.viewport.height) * (rangeY.max - rangeY.min);
  }

  setZoom(zoom, pointerX, pointerY) {
    this.zoom = Math.max(this.getEffectiveMinZoom(), Math.min(this.maxZoom, zoom));
    this.setPointer(pointerX, pointerY);
  }

  setZoomAtScreenPoint(zoom, screenX, screenY) {
    const worldPoint = this.toWorld(screenX, screenY);
    this.zoom = Math.max(this.getEffectiveMinZoom(), Math.min(this.maxZoom, zoom));
    this.setWorldPointAtScreenPoint(worldPoint, screenX, screenY);
  }

  setWorldPointAtScreenPoint(worldPoint, screenX, screenY) {
    const requestedX = worldPoint.x - screenX / this.zoom;
    const requestedY = worldPoint.y - screenY / this.zoom;
    const rangeX = this.getRange('width', this.viewport.width);
    const rangeY = this.getRange('height', this.viewport.height);
    this.x = rangeX.min === rangeX.max ? rangeX.min : Math.max(rangeX.min, Math.min(rangeX.max, requestedX));
    this.y = rangeY.min === rangeY.max ? rangeY.min : Math.max(rangeY.min, Math.min(rangeY.max, requestedY));
  }

  centerOnWorldPoint(worldPoint) {
    this.setWorldPointAtScreenPoint(worldPoint, this.viewport.width / 2, this.viewport.height / 2);
  }

  panByScreen(deltaX, deltaY) {
    const requestedX = this.x - deltaX / this.zoom;
    const requestedY = this.y - deltaY / this.zoom;
    const rangeX = this.getRange('width', this.viewport.width);
    const rangeY = this.getRange('height', this.viewport.height);
    this.x = rangeX.min === rangeX.max ? rangeX.min : Math.max(rangeX.min, Math.min(rangeX.max, requestedX));
    this.y = rangeY.min === rangeY.max ? rangeY.min : Math.max(rangeY.min, Math.min(rangeY.max, requestedY));
  }

  toWorld(x, y) {
    return { x: this.x + x / this.zoom, y: this.y + y / this.zoom };
  }
}
