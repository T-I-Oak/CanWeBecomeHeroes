import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import GameTextRepository from '../../../src/game/GameTextRepository.js';
import { expandLanguageResource, setLanguage } from '../../../../GameWorksOAK/src/lib/core/i18n.js';
import { selectRecruitmentContext } from '../../../src/game/RecruitmentCast.js';
import { createRecruitmentVignette } from '../../../src/game/RecruitmentVignette.js';

const resource = JSON.parse(fs.readFileSync(new URL('../../../public/data/text/vignette.json', import.meta.url)));
const pairs = [['Avery', 'Briar'], ['Casey', 'Darcy'], ['Ellis', 'Finley'], ['Garnet', 'Harper']];
const roles = ['victory', 'agreement', 'praise', 'invitation', 'acceptance', 'closing'];
const languageStorage = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key) => languageStorage.get(key) ?? null,
  setItem: (key, value) => languageStorage.set(key, value),
} });

test('all 72 joining lines independently define Japanese and English', () => {
  for (const [playId, expectedRoles] of [['recruitmentObservedVictory', roles], ['recruitmentAcquaintance', ['praise', 'invitation', 'acceptance']]]) {
    assert.deepEqual(Object.keys(resource[playId]), expectedRoles);
    for (const role of expectedRoles) {
      assert.deepEqual(Object.keys(resource[playId][role]).sort(), pairs.flat().sort());
      for (const entry of Object.values(resource[playId][role])) {
        assert.match(entry['lang-store'].ja, /[ぁ-んァ-ヶ一-龠]/);
        assert.match(entry['lang-store'].en, /[a-zA-Z]/);
      }
    }
  }
});

test('both languages switch only the three joining lines for every acquaintance direction and party size', () => {
  for (const language of ['ja', 'en']) {
    setLanguage(language);
    const repository = new GameTextRepository();
    repository.resource = { vignette: expandLanguageResource(resource) };
    assert.equal(repository.getVignetteLine('recruitmentAcquaintance', 'praise', 'Avery'), resource.recruitmentAcquaintance.praise.Avery['lang-store'][language]);
    for (const pair of pairs) for (const recruitedId of pair) for (const count of [2, 3]) {
      const friend = pair.find((id) => id !== recruitedId);
      const ids = [friend, ...pairs.flat().filter((id) => !pair.includes(id)).slice(0, count - 1)];
      const context = selectRecruitmentContext({ members: ids.map((heroId) => ({ heroId })), recruitedHero: { heroId: recruitedId } });
      const lines = createRecruitmentVignette({ ...context, enemies: [], textRepository: repository }).commands.filter((command) => command.type === 'line');
      const speakers = ['A', 'B', 'X', count === 3 ? 'C' : 'B', 'X', 'A'];
      assert.deepEqual(lines.map((line) => line.instanceId), speakers);
      lines.forEach((line, index) => assert.equal(line.text, repository.getVignetteLine(
        [2, 3, 4].includes(index) ? 'recruitmentAcquaintance' : 'recruitmentObservedVictory', roles[index], context.cast[speakers[index]],
      )));
    }
  }
});

test('missing acquaintance text fails instead of falling back to the general line', () => {
  const repository = new GameTextRepository();
  repository.resource = { vignette: { recruitmentObservedVictory: { praise: { Avery: 'general' } } } };
  assert.throws(() => repository.getVignetteLine('recruitmentAcquaintance', 'praise', 'Avery'), /Unknown vignette line/);
});
