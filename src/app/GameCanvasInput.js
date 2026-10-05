const DRAG_START_DISTANCE = 6;
const ZOOM_IN_FACTOR = 1.1;
const EDGE_SCROLL_MARGIN = 56;
const EDGE_SCROLL_SPEED = 360;
const MAX_SCROLL_DELTA_SECONDS = 0.05;

export default class GameCanvasInput {
  constructor(canvas, { screenTargetInputRoot, camera, controller, getCursor, getInformationTarget, getScreenTarget, onScreenTarget, onInformationTarget, onPortalOpen, onReleaseStaminaPause }) {
    this.canvas = canvas;
    this.screenTargetInputRoot = screenTargetInputRoot;
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
    this.pinch = null;
    this.pinchLockout = false;
    this.activePointers = new Map();
    this.bindEvents();
  }

  bindEvents() {
    this.screenTargetInputRoot.addEventListener('pointerdown', (event) => this.handleScreenTargetPointerDown(event), { capture: true, passive: false });
    this.canvas.addEventListener('pointerdown', (event) => this.handlePointerDown(event), { passive: false });
    this.canvas.addEventListener('pointermove', (event) => this.handlePointerMove(event), { passive: false });
    this.canvas.addEventListener('pointerup', (event) => this.handlePointerUp(event));
    this.canvas.addEventListener('pointercancel', (event) => this.handlePointerCancel(event));
    this.canvas.addEventListener('lostpointercapture', (event) => this.handleLostPointerCapture(event));
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

  handleScreenTargetPointerDown(event) {
    if (!this.controller) return;
    const screenTarget = this.getScreenTarget(this.getScreenPoint(event));
    if (!screenTarget) return;
    event.preventDefault();
    event.stopPropagation();
    this.handlePointerDown(event, screenTarget);
  }

  handlePointerDown(event, screenTarget = this.getScreenTarget(this.getScreenPoint(event))) {
    if (!this.controller) return;
    event.preventDefault();
    this.activePointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    try {
      this.canvas.setPointerCapture?.(event.pointerId);
    } catch (_) {}

    if (this.activePointers.size >= 2) {
      if (this.drag) {
        if (this.drag.startedSelection) this.controller.clearSelection();
        this.drag = null;
      }
      if (!this.pinch) {
        const [firstId, secondId] = Array.from(this.activePointers.keys());
        const p1 = this.activePointers.get(firstId);
        const p2 = this.activePointers.get(secondId);
        const distance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
        const center = { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };
        this.pinch = { pointerIds: [firstId, secondId], lastDistance: distance, lastCenter: center };
        this.pinchLockout = true;
      }
      return;
    }

    if (this.pinchLockout) return;

    const point = this.getWorldPoint(event);
    const entity = screenTarget ? screenTarget.hero : this.controller.getEntityAt(point.x, point.y);
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
  }

  handlePointerMove(event) {
    if (!this.controller) return;
    if (this.activePointers.has(event.pointerId)) {
      this.activePointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
    }

    if (this.pinch && this.pinch.pointerIds.includes(event.pointerId)) {
      event.preventDefault?.();
      const [id1, id2] = this.pinch.pointerIds;
      const p1 = this.activePointers.get(id1);
      const p2 = this.activePointers.get(id2);
      if (p1 && p2) {
        const distance = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
        const center = { x: (p1.clientX + p2.clientX) / 2, y: (p1.clientY + p2.clientY) / 2 };
        const bounds = this.canvas.getBoundingClientRect();
        const screenLastCenter = { x: this.pinch.lastCenter.x - bounds.left, y: this.pinch.lastCenter.y - bounds.top };
        const screenCurrentCenter = { x: center.x - bounds.left, y: center.y - bounds.top };
        const worldTarget = this.camera.toWorld(screenLastCenter.x, screenLastCenter.y);

        if (this.pinch.lastDistance > 0 && distance > 0) {
          const factor = distance / this.pinch.lastDistance;
          this.camera.zoom = Math.max(this.camera.getEffectiveMinZoom(), Math.min(this.camera.maxZoom, this.camera.zoom * factor));
        }
        this.camera.setWorldPointAtScreenPoint(worldTarget, screenCurrentCenter.x, screenCurrentCenter.y);
        this.pinch.lastDistance = distance;
        this.pinch.lastCenter = center;
      }
      return;
    }

    if (this.pinchLockout) return;

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
    if (this.drag.startedSelection) this.updateSelectionHover(event);
    if (this.drag.moved && !this.drag.entity) this.camera.panByScreen(event.clientX - this.drag.lastX, event.clientY - this.drag.lastY);
    this.drag.lastX = event.clientX;
    this.drag.lastY = event.clientY;
  }

  updateSelectionHover(event) {
    const point = this.getWorldPoint(event);
    const target = this.getScreenTarget(this.getScreenPoint(event));
    this.controller.updateSelectionHover(point.x, point.y, target?.hero);
  }

  update(deltaSeconds) {
    if (!this.drag?.startedSelection || this.pinchLockout || !this.controller) return;
    const event = { clientX: this.drag.lastX, clientY: this.drag.lastY };
    const point = this.getScreenPoint(event);
    const { width, height } = this.canvas.getBoundingClientRect();
    if (point.x < 0 || point.y < 0 || point.x > width || point.y > height) return;
    const axisSpeed = (position, size) => {
      const margin = Math.min(EDGE_SCROLL_MARGIN, size / 2);
      if (position < margin) return (margin - position) / margin;
      if (position > size - margin) return -(position - size + margin) / margin;
      return 0;
    };
    const distance = EDGE_SCROLL_SPEED * Math.min(deltaSeconds, MAX_SCROLL_DELTA_SECONDS);
    this.camera.panByScreen(axisSpeed(point.x, width) * distance, axisSpeed(point.y, height) * distance);
    this.updateSelectionHover(event);
  }

  releaseActivePointer(pointerId) {
    this.activePointers.delete(pointerId);
    if (this.pinch) {
      if (this.pinch.pointerIds.includes(pointerId) || this.activePointers.size < 2) {
        this.pinch = null;
      }
    }
    if (this.activePointers.size === 0) {
      const hadLockout = this.pinchLockout;
      this.pinchLockout = false;
      if (hadLockout) {
        this.onReleaseStaminaPause?.();
        return true;
      }
    }
    return false;
  }

  handlePointerUp(event) {
    const isLockoutEnd = this.releaseActivePointer(event.pointerId);
    if (isLockoutEnd || this.pinchLockout) return;

    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const point = this.getWorldPoint(event);
    this.onReleaseStaminaPause();
    if (this.drag.startedSelection) {
      this.updateSelectionHover(event);
      const target = this.getScreenTarget(this.getScreenPoint(event));
      if (!this.controller.completeSelectionAt(point.x, point.y, target?.hero)) this.controller.clearSelection();
    }
    if (!this.drag.moved) {
      if (this.drag.screenTarget) this.onScreenTarget(this.drag.screenTarget, event);
      else {
        const target = this.getInformationTarget(point, event);
        if (target?.type === 'portal') this.onPortalOpen();
        else if (target) this.onInformationTarget(target, event);
      }
    }
    this.drag = null;
  }

  handlePointerCancel(event) {
    const pointerId = event?.pointerId;
    if (pointerId != null) {
      if (this.drag?.pointerId === pointerId) {
        if (this.drag.startedSelection) this.controller.clearSelection();
        this.drag = null;
      }
      this.releaseActivePointer(pointerId);
      return;
    }
    if (this.drag?.startedSelection) this.controller.clearSelection();
    this.drag = null;
    this.pinch = null;
    this.activePointers.clear();
    this.pinchLockout = false;
    this.onReleaseStaminaPause?.();
  }

  handleLostPointerCapture(event) {
    const pointerId = event?.pointerId;
    if (pointerId == null || !this.activePointers.has(pointerId)) return;
    this.handlePointerCancel(event);
  }

  handleWheel(event) {
    if (!this.controller) return;
    event.preventDefault();
    const bounds = this.canvas.getBoundingClientRect();
    const factor = event.deltaY < 0 ? ZOOM_IN_FACTOR : 1 / ZOOM_IN_FACTOR;
    this.camera.setZoomAtScreenPoint(this.camera.zoom * factor, event.clientX - bounds.left, event.clientY - bounds.top);
  }
}
