import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { getImageConversionPlan, validateImageDefinition } from '../../../scripts/lib/ImageConversion.js';
import definitions from '../../../assets/image-sizes.json' with { type: 'json' };
import manifest from '../../../src/chips/image-levels.json' with { type: 'json' };

test('conversion preserves aspect ratio, omits original-size levels and rejects upscale or invalid definitions', () => {
  assert.deepEqual(getImageConversionPlan(1024, 512, 256), {
    width: 256, height: 128,
    levels: [8, 16, 32, 64, 128].map(width => ({ width, height: width / 2 })),
  });
  assert.throws(() => getImageConversionPlan(128, 128, 256));
  assert.throws(() => getImageConversionPlan(0, 512, 128));
  const definition = { size: 256, sourceSha256: 'a'.repeat(64) };
  assert.doesNotThrow(() => validateImageDefinition('/assets/status/weight.png', definition));
  assert.throws(() => validateImageDefinition('/assets/../../source.png', definition));
  assert.throws(() => validateImageDefinition('/assets/status/weight.png', { ...definition, size: -1 }));
  assert.throws(() => validateImageDefinition('/assets/status/weight.png', { ...definition, sourceSha256: '' }));
});

test('every retained master has a size definition and matching delivery asset and level catalog', () => {
  const root = new URL('../../../', import.meta.url);
  const masterPaths = readdirSync(new URL(`${definitions.sourceRoot}/`, root), { recursive: true })
    .filter(path => path.endsWith('.png')).map(path => `/assets/${path.replaceAll('\\', '/')}`).sort();
  assert.deepEqual(masterPaths, Object.keys(definitions.images).sort());
  assert.deepEqual(Object.keys(manifest).sort(), masterPaths);
  for (const path of masterPaths) {
    const definition = definitions.images[path];
    validateImageDefinition(path, definition);
    const master = readFileSync(new URL(`${definitions.sourceRoot}/${path.slice('/assets/'.length)}`, root));
    assert.equal(createHash('sha256').update(master).digest('hex'), definition.sourceSha256, `Master changed: ${path}`);
    const plan = getImageConversionPlan(master.readUInt32BE(16), master.readUInt32BE(20), definition.size);
    const delivery = readFileSync(new URL(`public${path}`, root));
    assert.equal(delivery.readUInt32BE(16), plan.width, path);
    assert.equal(delivery.readUInt32BE(20), plan.height, path);
    assert.deepEqual({ width: manifest[path].width, height: manifest[path].height }, { width: plan.width, height: plan.height });
    assert.deepEqual(manifest[path].levels.map(({ width, height }) => ({ width, height })), plan.levels);
    if (plan.width === master.readUInt32BE(16) && plan.height === master.readUInt32BE(20)) assert.deepEqual(delivery, master);
  }
});
