import test from 'node:test';
import assert from 'node:assert/strict';
import { createModalDialog } from '../../src/app/ModalDialog.js';

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.className = '';
    this.children = [];
    this.attributes = {};
  }

  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes[name] = value; }
  set textContent(value) { this.children = [value]; }
}

test('modal dialog creates one shared header, body, and optional footer structure', (t) => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: tagName => new Element(tagName) };
  t.after(() => { globalThis.document = previousDocument; });

  const modal = createModalDialog({
    dialogClass: 'ExampleModal__Dialog',
    title: 'Example',
    titleId: 'example-modal-title',
  });

  assert.equal(modal.dialog.className, 'ModalDialog ExampleModal__Dialog');
  assert.equal(modal.dialog.attributes.role, 'dialog');
  assert.equal(modal.dialog.attributes['aria-modal'], 'true');
  assert.equal(modal.dialog.attributes['aria-labelledby'], 'example-modal-title');
  assert.equal(modal.header.className, 'ModalDialog__Header');
  assert.equal(modal.body.className, 'ModalDialog__Body');
  assert.equal(modal.footer.className, 'ModalDialog__Footer');
  assert.equal(modal.titleElement.tagName, 'h1');
  assert.equal(modal.titleElement.id, 'example-modal-title');
});
