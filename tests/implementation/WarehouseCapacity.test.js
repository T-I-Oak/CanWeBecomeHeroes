import test from 'node:test';
import assert from 'node:assert/strict';
import ChipBoard from '../../src/chips/ChipBoard.js';
import HeroItemInteractionController from '../../src/game/HeroItemInteractionController.js';
import HeroSlotManager from '../../src/game/HeroSlotManager.js';
import ItemFactory from '../../src/game/ItemFactory.js';
import ItemPickupController from '../../src/game/ItemPickupController.js';
import { getHexagonalGridCapacity, getWarehouseItemCapacity } from '../../src/game/WarehouseCapacity.js';

test('warehouse capacity chooses the denser of the two hexagonal grid directions', () => {
  assert.equal(getHexagonalGridCapacity({ width: 1344, height: 1120, diameter: 75 }), 289);
  assert.equal(getWarehouseItemCapacity(), 289);
});

test('warehouse additions stop at the calculated capacity', () => {
  const board = new ChipBoard({ width: 3000, height: 2000 });
  const controller = new HeroItemInteractionController(board, new ItemPickupController(board, new HeroSlotManager()));
  const factory = new ItemFactory();
  const capacity = getWarehouseItemCapacity();
  Array.from({ length: capacity }, (_, index) => factory.createWeapon({ weapon: 'sword', tags: [], x: 800 + index, y: 700 }))
    .forEach((item) => assert.ok(controller.addToWarehouse(item)));

  const overflow = factory.createWeapon({ weapon: 'sword', tags: [], x: 800, y: 700 });
  assert.equal(controller.addToWarehouse(overflow), null);
  assert.equal(controller.getWarehouseItemCount(), capacity);
  assert.equal(board.chips.includes(overflow.chip), false);
});
