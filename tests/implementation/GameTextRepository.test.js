import test from 'node:test';
import assert from 'node:assert/strict';
import GameTextRepository, { TEXT_RESOURCE_PATHS, textPart } from '../../src/game/GameTextRepository.js';

test('game text repository exposes resolved information details and reloads them on language refresh', async () => {
  const resources = [
    { information: { facility: { training: { name: '訓練場', description: [] } } }, nameplate: { facility: { training: { name: 'Training' } } } },
    { information: { facility: { training: { name: 'Training Ground', description: [] } } }, nameplate: { facility: { training: { name: 'Training' } } } },
  ];
  const paths = [];
  let call = 0;
  const repository = new GameTextRepository({ loadResource: async (path) => {
    paths.push(path);
    const resource = resources[Math.floor(call / TEXT_RESOURCE_PATHS.length)];
    call += 1;
    return textPart(resource, path);
  } });

  await repository.load();
  assert.equal(repository.getInformationDetail('facility', 'training').name, '訓練場');
  assert.equal(repository.getName('facility', 'training', 'nameplate'), 'Training');
  await repository.refreshLanguage();
  assert.equal(repository.getName('facility', 'training'), 'Training Ground');
  assert.deepEqual(paths, [...TEXT_RESOURCE_PATHS, ...TEXT_RESOURCE_PATHS]);
});

test('game text repository exposes every migrated area and facility detail and nameplate', async () => {
  const resource = {
    information: {
      area: Object.fromEntries(['preparation', 'warehouse', 'battle'].map((id) => [id, { name: id, flavor: id, description: [] }])),
      facility: Object.fromEntries(['shop', 'guild', 'training'].map((id) => [id, { name: id, flavor: id, description: [] }])),
    },
    nameplate: {
      area: Object.fromEntries(['preparation', 'warehouse', 'battle'].map((id) => [id, { name: `${id} plate` }])),
      facility: Object.fromEntries(['shop', 'guild', 'training'].map((id) => [id, { name: `${id} plate` }])),
    },
  };
  const repository = new GameTextRepository({ loadResource: async (path) => textPart(resource, path) });
  await repository.load();

  [['area', ['preparation', 'warehouse', 'battle']], ['facility', ['shop', 'guild', 'training']]].forEach(([kind, ids]) => {
    ids.forEach((id) => {
      assert.equal(repository.getInformationDetail(kind, id).name, id);
      assert.equal(repository.getName(kind, id, 'nameplate'), `${id} plate`);
    });
  });
});
