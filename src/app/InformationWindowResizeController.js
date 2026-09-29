import { resizeInformationWindow } from './InformationWindowScale.js';

export default class InformationWindowResizeController {
  constructor({ manager, positioner }) { Object.assign(this, { manager, positioner }); }

  begin(event, windowElement, entry, corner) {
    if (!this.manager) throw new Error('InformationWindowResizeController requires an InformationWindowManager.');
    if (event.button !== 0) return false;
    event.stopPropagation();
    event.preventDefault();
    const layoutWidth = windowElement.offsetWidth;
    const layoutHeight = windowElement.offsetHeight;
    const left = Number.parseFloat(windowElement.style.left);
    const top = Number.parseFloat(windowElement.style.top);
    const scale = entry.scale;
    let latest = { scale, left, top };
    let finished = false;
    const apply = (pointerEvent) => {
      const viewport = this.positioner.getViewport();
      latest = resizeInformationWindow({
        layoutWidth,
        layoutHeight,
        left,
        top,
        scale,
        corner,
        pointerX: pointerEvent.clientX,
        pointerY: pointerEvent.clientY,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      });
      windowElement.style.scale = String(latest.scale);
      windowElement.style.left = `${latest.left}px`;
      windowElement.style.top = `${latest.top}px`;
      windowElement.style.transform = 'none';
    };
    const move = (moveEvent) => apply(moveEvent);
    const finish = (endEvent) => {
      if (finished) return;
      finished = true;
      windowElement.removeEventListener('pointermove', move);
      windowElement.removeEventListener('pointerup', finish);
      windowElement.removeEventListener('pointercancel', finish);
      apply(endEvent);
      this.manager.setDragging(false);
      this.manager.setFrame(entry.id, { scale: latest.scale, position: { x: latest.left, y: latest.top } });
    };
    this.manager.setDragging(true);
    windowElement.setPointerCapture(event.pointerId);
    windowElement.addEventListener('pointermove', move);
    windowElement.addEventListener('pointerup', finish);
    windowElement.addEventListener('pointercancel', finish);
    return true;
  }
}
