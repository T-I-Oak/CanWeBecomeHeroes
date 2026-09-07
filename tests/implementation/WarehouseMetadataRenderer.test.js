import test from 'node:test';
import assert from 'node:assert/strict';
import { getWarehouseMetadataLayout, isWarehousePortalAtPoint } from '../../src/app/WarehouseMetadataRenderer.js';

function createContext() {
  return {
    font: '',
    save() {},
    restore() {},
    measureText(value) { return { width: value.length * 8 }; },
  };
}

test('warehouse metadata keeps a clickable portal region after version and copyright text', () => {
  const context = createContext();
  const layout = getWarehouseMetadataLayout(context);
  assert.match(layout.version, /^v\d+\.\d+\.\d+$/);
  assert.ok(layout.portalBounds.x > layout.x);
  assert.equal(isWarehousePortalAtPoint(context, { x: layout.portalBounds.x + 1, y: layout.portalBounds.y + 1 }), true);
  assert.equal(isWarehousePortalAtPoint(context, { x: layout.x, y: layout.y }), false);
});
