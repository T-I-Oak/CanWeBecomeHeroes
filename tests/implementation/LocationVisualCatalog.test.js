import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import createLocationNameplateBoundsRegistry from '../../src/app/LocationNameplateBoundsRegistry.js';
import { drawLocationNameplate } from '../../src/app/LocationNameplateRenderer.js';
import { LOCATION_NAMEPLATE_LAYOUT } from '../../src/game/LocationNameplateLayout.js';
import { LOCATION_ICON_SAFE_SIZE, LOCATION_ICON_SOURCE_SIZE, LOCATION_VISUALS, getLocationVisual } from '../../src/game/LocationVisualCatalog.js';

const LOCATION_NAMES = ['preparation', 'warehouse', 'battle', 'shop', 'guild', 'training'];

test('every game location has one visual asset and a shared nameplate size', () => {
  assert.equal(LOCATION_ICON_SOURCE_SIZE, 1024);
  assert.equal(LOCATION_ICON_SAFE_SIZE, 832);
  assert.equal(LOCATION_NAMEPLATE_LAYOUT.iconSize, 44);
  assert.deepEqual(Object.keys(LOCATION_VISUALS), LOCATION_NAMES);
  LOCATION_NAMES.forEach((location) => {
    assert.match(getLocationVisual(location).iconPath, /^\/assets\/areas\/.+\.png$/);
  });
});

test('location icon assets use the shared square source canvas', async () => {
  await Promise.all(LOCATION_NAMES.map(async (location) => {
    const { iconPath } = getLocationVisual(location);
    const file = await readFile(new URL(`../../public${iconPath}`, import.meta.url));
    assert.equal(file.toString('ascii', 1, 4), 'PNG');
    assert.equal(file.readUInt32BE(16), LOCATION_ICON_SOURCE_SIZE);
    assert.equal(file.readUInt32BE(20), LOCATION_ICON_SOURCE_SIZE);
  }));
});

test('location nameplates measure label width and retain the same rendered bounds for hit testing', () => {
  const context = {
    save() {}, restore() {}, beginPath() {}, roundRect() {}, fill() {}, stroke() {}, drawImage() {}, fillText() {},
    measureText(label) { return { width: label.length * 10 }; },
  };
  const assets = { load() { return { complete: true, naturalWidth: 1024, naturalHeight: 1024 }; } };
  const registry = createLocationNameplateBoundsRegistry();
  const homeBounds = drawLocationNameplate(context, assets, 'preparation', { x: 10, y: 20 }, 'Home');
  const warehouseBounds = drawLocationNameplate(context, assets, 'warehouse', { x: 10, y: 80 }, 'Warehouse');
  registry.setArea('preparation', homeBounds);
  registry.setArea('warehouse', warehouseBounds);

  assert.equal(warehouseBounds.width - homeBounds.width, 50);
  assert.equal(registry.getAreaAtPoint({ x: warehouseBounds.x + warehouseBounds.width - 1, y: warehouseBounds.y + 1 }), 'warehouse');
  assert.equal(registry.getAreaAtPoint({ x: warehouseBounds.x + warehouseBounds.width + 1, y: warehouseBounds.y + 1 }), null);
});
