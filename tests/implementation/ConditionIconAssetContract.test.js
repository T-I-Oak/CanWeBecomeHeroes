import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { forEachVisiblePixel, readRgbaPng } from '../../scripts/lib/PngRgba.js';

const CONDITION_DIRECTORY = join(process.cwd(), 'public', 'assets', 'conditions');
const PHYSICAL_SHIELD_PATH = join(process.cwd(), 'public', 'assets', 'effects', 'defense', 'physical-shield.png');
const CONDITION_FILENAMES = Object.freeze([
  'bewilderment.png',
  'ellipsis.png',
  'fire.png',
  'lightning.png',
  'misfortune.png',
  'night-familiar.png',
  'physical-defense.png',
  'two-edged-sword.png',
  'water.png',
]);

function getPixel(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return Array.from(image.pixels.subarray(offset, offset + 4));
}

test('condition icons are the complete shared white-glyph asset set', () => {
  const filenames = readdirSync(CONDITION_DIRECTORY).filter((name) => name.endsWith('.png')).sort();
  assert.deepEqual(filenames, CONDITION_FILENAMES);

  CONDITION_FILENAMES.forEach((filename) => {
    const image = readRgbaPng(join(CONDITION_DIRECTORY, filename));
    assert.equal(image.width, 1024, `${filename}: width`);
    assert.equal(image.height, 1024, `${filename}: height`);
    assert.deepEqual(getPixel(image, 0, 0), [0, 0, 0, 0], `${filename}: transparent outer margin`);
    let visibleCount = 0;
    forEachVisiblePixel(image, (x, y) => {
      const [red, green, blue] = getPixel(image, x, y);
      assert.ok(red >= 250, `${filename}: white red channel`);
      assert.ok(green >= 250, `${filename}: white green channel`);
      assert.ok(blue >= 250, `${filename}: white blue channel`);
      visibleCount += 1;
    });
    assert.ok(visibleCount > 0, `${filename}: visible glyph`);
  });
});

test('physical shield overlay keeps a visible metal rim and a transparent interior', () => {
  const shield = readRgbaPng(PHYSICAL_SHIELD_PATH);
  assert.equal(shield.width, 1024);
  assert.equal(shield.height, 1024);
  assert.deepEqual(getPixel(shield, 512, 420), [0, 0, 0, 0], 'shield interior remains transparent');
  assert.ok(getPixel(shield, 512, 90)[3] > 0, 'shield rim remains visible');
});
