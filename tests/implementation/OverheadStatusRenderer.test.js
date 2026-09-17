import test from 'node:test';
import assert from 'node:assert/strict';
import { drawOverheadStatus } from '../../src/app/OverheadStatusRenderer.js';

test('overhead status uses a readable combat-scale font and outline', () => {
  const context = {
    save() {}, restore() {}, strokeText() {}, fillText() {},
    font: '', lineWidth: 0,
  };
  const entity = {
    chip: { x: 50, y: 100, height: 0, radius: 30 },
    stamina: 3,
    hp: 0,
  };
  drawOverheadStatus(context, entity, 'durability', { getName: () => 'Durability' });
  assert.equal(context.font, '700 32px system-ui');
  assert.equal(context.lineWidth, 6);
});
