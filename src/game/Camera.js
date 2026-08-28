export default class Camera {
  constructor(world, { minZoom = 0.5, maxZoom = 1.5 } = {}) {
    this.world = world;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.zoom = minZoom;
    this.x = 0;
    this.y = 0;
  }

  setViewport(width, height) {
    this.viewport = { width, height };
    this.zoom = Math.max(this.zoom, this.getEffectiveMinZoom());
    this.setPointer(width / 2, height / 2);
  }

  getEffectiveMinZoom() {
    return Math.max(this.minZoom, Math.min(this.viewport.width / this.world.width, this.viewport.height / this.world.height));
  }

  setPointer(x, y) {
    const visibleWidth = this.viewport.width / this.zoom;
    const visibleHeight = this.viewport.height / this.zoom;
    const horizontalRange = this.world.width - visibleWidth;
    const verticalRange = this.world.height - visibleHeight;
    this.x = horizontalRange > 0 ? (x / this.viewport.width) * horizontalRange : horizontalRange / 2;
    this.y = verticalRange > 0 ? (y / this.viewport.height) * verticalRange : verticalRange / 2;
  }

  setZoom(zoom, pointerX, pointerY) {
    this.zoom = Math.max(this.getEffectiveMinZoom(), Math.min(this.maxZoom, zoom));
    this.setPointer(pointerX, pointerY);
  }

  panByScreen(deltaX, deltaY) {
    const visibleWidth = this.viewport.width / this.zoom;
    const visibleHeight = this.viewport.height / this.zoom;
    const horizontalRange = this.world.width - visibleWidth;
    const verticalRange = this.world.height - visibleHeight;
    this.x = horizontalRange > 0 ? Math.max(0, Math.min(horizontalRange, this.x - deltaX / this.zoom)) : horizontalRange / 2;
    this.y = verticalRange > 0 ? Math.max(0, Math.min(verticalRange, this.y - deltaY / this.zoom)) : verticalRange / 2;
  }

  toWorld(x, y) {
    return { x: this.x + x / this.zoom, y: this.y + y / this.zoom };
  }
}
