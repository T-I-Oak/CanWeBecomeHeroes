import test from 'node:test';
import assert from 'node:assert/strict';
import StageSelectionModal, { getPreviewTagAtPoint } from '../../src/app/StageSelectionModal.js';
import { getEnemyChipScale } from '../../src/game/HeroSlotLayout.js';

test('enemy previews allocate enough pixels for enemy size and device pixel ratio without changing CSS layout', () => {
  const originalDocument = globalThis.document;
  const originalRatio = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio');
  globalThis.document = { createElement: () => ({
    style: { setProperty() {} }, children: [],
    append(...children) { this.children.push(...children); },
    setAttribute() {}, addEventListener() {},
  }) };
  try {
    for (const ratio of [1, 1.25, 2, 3]) {
      Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: ratio });
      for (const size of ['small', 'medium', 'large']) {
        let drawn;
        const modal = Object.create(StageSelectionModal.prototype);
        modal.enemyLabels = [];
        modal.textRepository = { getName: () => 'Enemy' };
        modal.drawChipPreview = (...args) => { drawn = args; };
        const enemy = { definition: { size, id: 'enemy' }, chip: { radius: 64 }, tags: ['valor'] };
        modal.createEnemySlot(enemy, { slotPosition: 1, span: size === 'large' ? 2 : 1 });
        const canvas = modal.enemyLabels[0].canvas;
        const logicalSize = 100 * getEnemyChipScale(size);
        assert.equal(canvas.width, Math.round(logicalSize * ratio));
        assert.equal(canvas.height, canvas.width);
        assert.equal(canvas.style.width, undefined);
        assert.equal(drawn[2], logicalSize);
        canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: logicalSize, height: logicalSize });
        // One tag is at the top of the chip. Its hit area stays in CSS coordinates.
        assert.equal(getPreviewTagAtPoint(enemy, canvas, 10 + logicalSize / 2, 20 + logicalSize * 0.15), 'valor');
        assert.equal(getPreviewTagAtPoint(enemy, canvas, 10 + logicalSize / 2, 20 + logicalSize / 2), null);
      }
    }
  } finally {
    globalThis.document = originalDocument;
    if (originalRatio) Object.defineProperty(globalThis, 'devicePixelRatio', originalRatio);
    else delete globalThis.devicePixelRatio;
  }
});
