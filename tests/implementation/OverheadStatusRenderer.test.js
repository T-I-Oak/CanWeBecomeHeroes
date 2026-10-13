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

test('durability labels distinguish hero stamina and enemy HP', () => {
  for (const names of [{ stamina: 'スタミナ', hp: 'HP' }, { stamina: 'Stamina', hp: 'HP' }]) {
    const labels = [];
    const context = { save() {}, restore() {}, strokeText() {}, fillText: (label) => labels.push(label) };
    for (const type of ['hero', 'enemy']) {
      drawOverheadStatus(context, {
        chip: { type, x: 0, y: 0, height: 0, radius: 30 }, staminaUnits: 300, hpUnits: 450,
      }, 'durability', { getName: (_, status) => names[status] });
    }
    assert.deepEqual(labels, [names.stamina + ' 300', 'HP 450']);
  }
});

test('settings use localized stamina and HP labels and preserve saved selections', async () => {
  const { default: Controller } = await import('../../src/app/OverheadStatusSettingsController.js');
  let names = { stamina: 'スタミナ', hp: 'HP', power: '武勇' };
  const statusLabels = ['durability', 'power'].map((status) => ({ dataset: { overheadStatus: status } }));
  const controller = new Controller({
    dataManager: { getValue: () => ({ statuses: ['durability'], visibility: 'battle' }) },
    textRepository: { getName: (_, status) => names[status] },
    elements: { statuses: [], visibility: { addEventListener() {} }, statusLabels },
  });
  assert.deepEqual(statusLabels.map((label) => label.textContent), ['スタミナ / HP', '武勇']);
  names = { stamina: 'Stamina', hp: 'HP', power: 'Power' };
  controller.refreshLabels();
  assert.deepEqual(statusLabels.map((label) => label.textContent), ['Stamina / HP', 'Power']);
  assert.deepEqual(controller.getSettings(), { statuses: ['durability'], visibility: 'battle' });
});
