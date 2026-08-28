import test from 'node:test';
import assert from 'node:assert/strict';
import { getStatusDetail, STATUS_DETAILS } from '../../src/game/StatusDetailCatalog.js';

test('status detail catalog describes every displayed hero status and enemy hp', () => {
  ['power', 'magic', 'speed', 'negotiation', 'luck', 'stamina', 'hp'].forEach((status) => {
    assert.ok(STATUS_DETAILS[status].name);
    assert.ok(STATUS_DETAILS[status].description);
  });
  assert.equal(getStatusDetail('power').name, 'パワー');
});
