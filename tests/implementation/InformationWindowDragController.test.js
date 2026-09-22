import test from 'node:test';
import assert from 'node:assert/strict';
import InformationWindowDragController from '../../src/app/InformationWindowDragController.js';
import InformationWindowPositioner from '../../src/app/InformationWindowPositioner.js';

function createWindowElement() {
  const listeners = new Map();
  return {
    style: {},
    listeners,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 240 }),
    setPointerCapture(pointerId) { this.capturedPointerId = pointerId; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
  };
}

test('an information window moves when its title starts a pointer drag', () => {
  const dragging = [];
  const positions = [];
  const manager = {
    setDragging: active => dragging.push(active),
    setPosition: (id, position) => positions.push({ id, position }),
  };
  const positioner = new InformationWindowPositioner({ getViewport: () => ({ width: 1280, height: 720 }) });
  const controller = new InformationWindowDragController({ manager, positioner });
  const windowElement = createWindowElement();
  const entry = { id: 'window-1' };

  const startEvent = {
    button: 0,
    pointerId: 1,
    clientX: 140,
    clientY: 160,
    target: { closest: () => null },
    preventDefault() {},
    stopPropagation() { this.propagationStopped = true; },
  };
  controller.begin(startEvent, windowElement, entry);

  windowElement.listeners.get('pointermove')({ clientX: 320, clientY: 360 });
  windowElement.listeners.get('pointerup')({ clientX: 320, clientY: 360 });

  assert.equal(windowElement.capturedPointerId, 1);
  assert.equal(startEvent.propagationStopped, true);
  assert.equal(windowElement.style.left, '180px');
  assert.equal(windowElement.style.top, '200px');
  assert.deepEqual(dragging, [true, false]);
  assert.deepEqual(positions, [{ id: 'window-1', position: { x: 180, y: 200 } }]);
});

test('a drag controller can receive its manager after layer construction', () => {
  const manager = { setDragging() {}, setPosition() {} };
  const controller = new InformationWindowDragController({ manager: null, positioner: { constrain: (_bounds, x, y) => ({ x, y }) } });
  controller.setManager(manager);
  assert.equal(controller.manager, manager);
});

