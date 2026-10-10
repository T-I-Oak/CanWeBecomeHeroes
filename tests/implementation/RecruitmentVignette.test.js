import test from 'node:test';
import assert from 'node:assert/strict';
import gameText from '../../src/game/readGameText.js';
import { expandLanguageResource, setLanguage } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import GameTextRepository, { textPart } from '../../src/game/GameTextRepository.js';
import HeroFactory, { HERO_PROFESSION_IDS } from '../../src/game/HeroFactory.js';
import { getEnemyDefinitionById } from '../../src/game/EnemyCatalog.js';
import { createRecruitmentVignette } from '../../src/game/RecruitmentVignette.js';
import { selectRecruitmentCast } from '../../src/game/RecruitmentCast.js';
import { createVignettePlayback, updateVignettePlayback } from '../../src/game/VignettePlayer.js';

const factory = new HeroFactory();
const languageStorage = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key) => languageStorage.get(key) ?? null,
  setItem: (key, value) => languageStorage.set(key, value),
} });
const hero = (profession, slot = null, area = 'battle') => Object.assign(factory.create({ profession, x: 0, y: 0 }), { currentSlotId: slot, currentArea: area });
const enemies = Array.from({ length: 6 }, (_, index) => ({ slotPosition: index + 1, definition: getEnemyDefinitionById(index < 2 ? 'medium-iron' : 'small-fire') }));
async function texts(language = 'ja') {
  setLanguage(language);
  const expanded = expandLanguageResource(gameText);
  return new GameTextRepository({ loadResource: async (path) => textPart(expanded, path) }).load();
}
const input = (textRepository, count = 2) => ({ cast: { A: 'Briar', B: 'Avery', ...(count === 3 ? { C: 'Casey' } : {}), X: 'Darcy' }, enemies, textRepository });

test('members use battle slots 2,3,1,4 then preparation order regardless of current area', () => {
  const members = [hero('swordfighter', 'battle-4'), hero('guard', 'battle-3'), hero('mage', 'battle-2')];
  assert.deepEqual(selectRecruitmentCast({ members, recruitedHero: hero('cleric') }), { A: 'Casey', B: 'Briar', C: 'Avery', X: 'Darcy' });
  assert.deepEqual(selectRecruitmentCast({ members: [hero('swordfighter', 'battle-4'), hero('guard', null, 'shop'), hero('mage', 'battle-1')], recruitedHero: hero('cleric') }), { A: 'Casey', B: 'Avery', C: 'Briar', X: 'Darcy' });
  assert.deepEqual(selectRecruitmentCast({ members: [hero('swordfighter', null, 'training'), hero('guard', null, 'shop')], recruitedHero: hero('cleric') }), { A: 'Avery', B: 'Briar', X: 'Darcy' });
  assert.equal(members[0].profession, 'swordfighter');
});

test('two and three member parties switch invitation speaker and their localized resource', async () => {
  const repository = await texts();
  for (const count of [2, 3]) {
    const context = input(repository, count);
    const requests = [];
    context.textRepository = { getVignetteLine: (play, line, person) => { requests.push([line, person]); return `${line}:${person}`; } };
    const scenario = createRecruitmentVignette(context);
    const lines = scenario.commands.filter((command) => command.type === 'line');
    assert.deepEqual(lines.map((line) => line.instanceId), ['A', 'B', 'X', count === 3 ? 'C' : 'B', 'X', 'A']);
    assert.deepEqual(requests, [['victory', 'Briar'], ['agreement', 'Avery'], ['praise', 'Darcy'], ['invitation', count === 3 ? 'Casey' : 'Avery'], ['acceptance', 'Darcy'], ['closing', 'Briar']]);
    assert.equal(scenario.instances.filter((instance) => instance.kind === 'character').length, count + 1);
  }
});

test('all six dialogue roles have non-placeholder lines for all eight heroes in both languages', async () => {
  for (const language of ['ja', 'en']) {
    const repository = await texts(language);
    for (const profession of HERO_PROFESSION_IDS) {
      for (const role of ['victory', 'agreement', 'praise', 'invitation', 'acceptance', 'closing']) {
        const line = repository.getVignetteLine('recruitmentObservedVictory', role, hero(profession).heroId);
        const placeholder = language === 'ja' ? '（仮セリフ）' : '(Placeholder dialogue)';
        assert.notEqual(line, placeholder);
      }
    }
  }
});

test('defeated encounter retains species, slots, size ratio and perspective', async () => {
  const scenario = createRecruitmentVignette(input(await texts()));
  const initialPositions = scenario.commands.filter((command) => command.type === 'position' && command.instanceId.startsWith('enemy-') && command.seconds === 0);
  const initialFacings = scenario.commands.filter((command) => command.type === 'facing' && command.instanceId.startsWith('enemy-')).slice(0, 6);
  assert.deepEqual(scenario.instances.filter((instance) => instance.kind === 'enemy').map((instance) => instance.enemyId).sort(), enemies.map((enemy) => enemy.definition.id).sort());
  assert.equal(new Set(initialPositions.map((position) => `${position.x},${position.y}`)).size, 6);
  assert.equal(initialFacings[0].chipRadius / initialFacings[2].chipRadius, 1.5);
  assert.ok(Math.abs(initialFacings[1].chipRadius / initialFacings[0].chipRadius - 1.6 / 2) < 1e-10);
});

test('shared player completes battle, entrance, six speeches and frame closure without a recruitment branch', async () => {
  const scenario = createRecruitmentVignette(input(await texts(), 3));
  const playback = createVignettePlayback(scenario);
  const speakers = [];
  let lastSerial = -1;
  let sawCombat = false;
  for (let frame = 0; frame < 1000 && !playback.done; frame += 1) {
    updateVignettePlayback(playback, 0.05);
    if (playback.instances.get('enemy-0').facing.stepDistance > 0) sawCombat = true;
    if (playback.line && playback.line.serial !== lastSerial) {
      speakers.push(playback.line.instanceId);
      lastSerial = playback.line.serial;
      if (speakers.length <= 2) assert.equal(playback.instances.get('X').position.x, 620);
      if (speakers.length >= 3) assert.equal(playback.instances.get('X').position.x, 470);
      for (const enemy of enemies.map((_, index) => playback.instances.get(`enemy-${index}`))) assert.ok(enemy.position.y < 0);
    }
  }
  assert.ok(sawCombat);
  assert.ok(playback.done);
  assert.deepEqual(speakers, ['A', 'B', 'X', 'C', 'X', 'A']);
  assert.equal(playback.view.clip.width, 0);
});
