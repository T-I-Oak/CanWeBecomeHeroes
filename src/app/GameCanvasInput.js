const DRAG_START_DISTANCE = 6;
const ZOOM_IN_FACTOR = 1.1;

export default class GameCanvasInput {
  constructor(canvas, { camera, controller, getCursor, getInformationTarget, getScreenTarget, onScreenTarget, onInformationTarget, onPortalOpen, onReleaseStaminaPause }) {
    this.canvas = canvas;
    this.camera = camera;
    this.controller = controller;
    this.getCursor = getCursor;
    this.getInformationTarget = getInformationTarget;
    this.getScreenTarget = getScreenTarget;
    this.onScreenTarget = onScreenTarget;
    this.onInformationTarget = onInformationTarget;
    this.onPortalOpen = onPortalOpen;
    this.onReleaseStaminaPause = onReleaseStaminaPause;
    this.drag = null;
    this.bindEvents();
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event), { passive: false });
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event), { passive: false });
    this.canvas.addEventListener('pointerup', (event) => this.handlePointerUp(event));
    this.canvas.addEventListener('pointercancel', () => this.handlePointerCancel());
    this.canvas.addEventListener('wheel', (event) => this.handleWheel(event), { passive: false });
  }

  getWorldPoint(event) {
    const point = this.getScreenPoint(event);
    return this.camera.toWorld(point.x, point.y);
  }

  getScreenPoint(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  handlePointerDown(event) {
    if (!this.controller) return;
    event.preventDefault();
    const point = this.getWorldPoint(event);
    const screenTarget = this.getScreenTarget?.(this.getScreenPoint(event)) ?? null;
    const entity = screenTarget ? null : this.controller.getEntityAt(point.x, point.y);
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      entity,
      startedSelection: false,
      screenTarget,
    };
    this.canvas.setPointerCapture(event.pointerId);
  }

  handlePointerMove(event) {
    if (!this.controller) return;
    const point = this.getWorldPoint(event);
    const screenPoint = this.getScreenPoint(event);
    if (!this.drag || this.drag.pointerId !== event.pointerId) {
      this.canvas.style.cursor = this.getCursor(point, screenPoint);
      return;
    }
    const totalDistance = Math.hypot(event.clientX - this.drag.startX, event.clientY - this.drag.startY);
    if (totalDistance > DRAG_START_DISTANCE && !this.drag.moved) {
      this.drag.moved = true;
      this.drag.startedSelection = Boolean(this.drag.entity && !this.controller.hasSelectionSource() && this.controller.beginSelection(this.drag.entity));
    }
    if (this.drag.startedSelection) this.controller.updateSelectionHover(point.x, point.y);
    if (this.drag.moved && !this.drag.entity) this.camera.panByScreen(event.clientX - this.drag.lastX, event.clientY - this.drag.lastY);
    this.drag.lastX = event.clientX;
    this.drag.lastY = event.clientY;
  }

  handlePointerUp(event) {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const point = this.getWorldPoint(event);
    this.onReleaseStaminaPause();
    if (this.drag.startedSelection) {
      this.controller.updateSelectionHover(point.x, point.y);
      if (!this.controller.completeSelectionAt(point.x, point.y)) this.controller.clearSelection();
    }
    if (!this.drag.moved) {
      if (this.drag.screenTarget) this.onScreenTarget?.(this.drag.screenTarget, event);
      else {
        const target = this.getInformationTarget(point, event);
        if (target?.type === 'portal') this.onPortalOpen();
        else if (target) this.onInformationTarget(target, event);
      }
    }
    this.drag = null;
  }

  handlePointerCancel() {
    if (this.drag?.startedSelection) this.controller.clearSelection();
    this.drag = null;
  }

  handleWheel(event) {
    if (!this.controller) return;
    event.preventDefault();
    const bounds = this.canvas.getBoundingClientRect();
    const factor = event.deltaY < 0 ? ZOOM_IN_FACTOR : 1 / ZOOM_IN_FACTOR;
    this.camera.setZoomAtScreenPoint(this.camera.zoom * factor, event.clientX - bounds.left, event.clientY - bounds.top);
  }
}
