import test from 'node:test';
import assert from 'node:assert/strict';
import ModalLayer from '../../src/app/ModalLayer.js';

function createContainer() {
  const classes = new Set();
  return {
    hidden: true,
    classList: {
      add: (className) => classes.add(className),
      remove: (className) => classes.delete(className),
      has: (className) => classes.has(className),
    },
    replaceChildrenCalled: 0,
    replaceChildren() { this.replaceChildrenCalled += 1; },
  };
}

test('modal layer owns shared visibility and content cleanup', () => {
  const container = createContainer();
  const modalLayer = new ModalLayer(container);

  modalLayer.open();
  assert.equal(container.hidden, false);
  assert.equal(container.classList.has('state-open'), true);

  modalLayer.close();
  assert.equal(container.hidden, true);
  assert.equal(container.classList.has('state-open'), false);
  assert.equal(container.replaceChildrenCalled, 1);
});
