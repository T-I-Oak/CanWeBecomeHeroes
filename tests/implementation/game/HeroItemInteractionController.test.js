import test from 'node:test';
import assert from 'node:assert/strict';
import Chip from '../../../src/chips/Chip.js';
import ChipBoard from '../../../src/chips/ChipBoard.js';
import HeroItemInteractionController from '../../../src/game/HeroItemInteractionController.js';

function fixture() {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new HeroItemInteractionController(board, {});
  const entity = { chip: new Chip({ id: 1, type: 'item', x: 600, y: 900, weight: 1, tagPaths: [] }) };
  controller.add(entity);
  return { board, controller, entity };
}

test('airborne body is selectable at its rendered center, never at its separated shadow', () => {
  const { controller, entity } = fixture();
  Object.assign(entity.chip, { height: 180, effectOffsetX: 80, effectOffsetY: 25 });
  assert.equal(controller.getEntityAt(680, 745), entity);
  assert.equal(controller.tap(680, 745), entity);
  assert.equal(controller.getEntityAt(600, 900), undefined);
});

test('body hit radius follows scale, including zero, while a settled body retains its boundary', () => {
  const { controller, entity } = fixture();
  Object.assign(entity.chip, { height: 0, scale: 0.5 });
  assert.equal(controller.getEntityAt(618, 900), entity);
  assert.equal(controller.getEntityAt(620, 900), undefined);
  entity.chip.scale = 0;
  assert.equal(controller.getEntityAt(600, 900), undefined);
  entity.chip.scale = 1;
  assert.equal(controller.getEntityAt(637.5, 900), entity);
});

test('overlapping visual bodies select the last body in the board render order', () => {
  const { board, controller, entity } = fixture();
  const other = { chip: new Chip({ id: 2, type: 'item', x: 600, y: 1020, weight: 1, tagPaths: [] }) };
  entity.chip.height = 0;
  other.chip.height = 120;
  controller.add(other);
  const front = board.getRenderChips().at(-1);
  assert.equal(controller.getEntityAt(600, 900)?.chip, front);
  board.chips.reverse();
  assert.equal(controller.getEntityAt(600, 900)?.chip, board.getRenderChips().at(-1));
});
