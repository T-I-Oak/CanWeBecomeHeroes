export default class InformationWindowDragController {
  constructor({ manager, positioner }) { Object.assign(this, { manager, positioner }); }

  begin(event, windowElement, entry) {
    if (event.button !== 0 || event.target.closest('.InformationWindow__Pin, .InformationWindow__Compact')) return;
    const bounds = windowElement.getBoundingClientRect();
    const offset = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    const getPosition = (pointerEvent) => this.positioner.constrain(bounds, pointerEvent.clientX - offset.x, pointerEvent.clientY - offset.y);
    const move = (moveEvent) => {
      const position = getPosition(moveEvent);
      windowElement.style.left = `${position.x}px`;
      windowElement.style.top = `${position.y}px`;
      windowElement.style.transform = 'none';
    };
    const finish = (upEvent) => {
      windowElement.removeEventListener('pointermove', move);
      windowElement.removeEventListener('pointerup', finish);
      this.manager.setDragging(false);
      this.manager.setPosition(entry.id, getPosition(upEvent));
    };
    this.manager.setDragging(true);
    windowElement.setPointerCapture(event.pointerId);
    windowElement.addEventListener('pointermove', move);
    windowElement.addEventListener('pointerup', finish, { once: true });
    event.preventDefault();
  }
}
