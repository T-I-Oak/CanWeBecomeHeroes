const DRAG_START_DISTANCE = 6;
const ZOOM_IN_FACTOR = 1.1;

export default class GameCanvasInput {
  constructor(canvas, { camera, controller, getCursor, getInformationTarget, onInformationTarget, onPortalOpen, onReleaseStaminaPause }) {
    this.canvas = canvas;
    this.camera = camera;
    this.controller = controller;
    this.getCursor = getCursor;
    this.getInformationTarget = getInformationTarget;
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
    const bounds = this.canvas.getBoundingClientRect();
    return this.camera.toWorld(event.clientX - bounds.left, event.clientY - bounds.top);
  }

  handlePointerDown(event) {
    event.preventDefault();
    const point = this.getWorldPoint(event);
    const entity = this.controller.getEntityAt(point.x, point.y);
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      entity,
      startedSelection: false,
    };
    this.canvas.setPointerCapture(event.pointerId);
  }

  handlePointerMove(event) {
    const point = this.getWorldPoint(event);
    if (!this.drag || this.drag.pointerId !== event.pointerId) {
      this.canvas.style.cursor = this.getCursor(point);
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
    const selectionTarget = this.drag.startedSelection ? this.controller.getEntityAt(point.x, point.y) : null;
    const selectionAction = selectionTarget ? this.controller.getSelectionAction(this.drag.entity, selectionTarget) : null;
    if (selectionAction?.kind !== 'store') this.onReleaseStaminaPause();
    if (this.drag.startedSelection) {
      this.controller.updateSelectionHover(point.x, point.y);
      if (!this.controller.completeSelectionAt(point.x, point.y)) this.controller.clearSelection();
    }
    if (!this.drag.moved) {
      const target = this.getInformationTarget(point, event);
      if (target?.type === 'portal') this.onPortalOpen();
      else if (target) this.onInformationTarget(target, event);
    }
    this.drag = null;
  }

  handlePointerCancel() {
    if (this.drag?.startedSelection) this.controller.clearSelection();
    this.drag = null;
  }

  handleWheel(event) {
    event.preventDefault();
    const bounds = this.canvas.getBoundingClientRect();
    const factor = event.deltaY < 0 ? ZOOM_IN_FACTOR : 1 / ZOOM_IN_FACTOR;
    this.camera.setZoomAtScreenPoint(this.camera.zoom * factor, event.clientX - bounds.left, event.clientY - bounds.top);
  }
}
