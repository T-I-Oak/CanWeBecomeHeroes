import test from 'node:test';
import assert from 'node:assert/strict';
import { getTagBaseColors } from '../../src/game/TagCatalog.js';
import { STATUS_VISUALS } from '../../src/game/StatusVisualCatalog.js';

test('status tags and status gauges share the status visual catalog', () => {
  assert.equal(getTagBaseColors(['valor'])[0], STATUS_VISUALS.power.tagBaseColor);
  assert.equal(getTagBaseColors(['arcane'])[0], STATUS_VISUALS.magic.tagBaseColor);
  assert.equal(getTagBaseColors(['dexterity'])[0], STATUS_VISUALS.speed.tagBaseColor);
  assert.equal(getTagBaseColors(['reputation'])[0], STATUS_VISUALS.negotiation.tagBaseColor);
  assert.equal(getTagBaseColors(['fortune'])[0], STATUS_VISUALS.luck.tagBaseColor);
  assert.equal(STATUS_VISUALS.luck.gaugeFrameColor, '#8d3f68');
});
