import test from 'node:test';
import assert from 'node:assert/strict';
import resource from '../../public/data/game_text.json' with { type: 'json' };

test('every translation has Japanese and English with matching template parameters', () => {
  let translations = 0;
  const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  function visit(value, path = '$') {
    if (!value || typeof value !== 'object') return;
    if ('lang-store' in value) {
      const languages = value['lang-store'];
      assert.ok('ja' in languages && 'en' in languages, path);
      assert.equal(typeof languages.ja, typeof languages.en, path);
      if (typeof languages.en === 'string') {
        assert.ok(languages.ja.trim() && languages.en.trim(), path);
        assert.doesNotMatch(languages.en, /[ぁ-んァ-ヶ一-龠]/, path);
        assert.deepEqual(parameters(languages.en), parameters(languages.ja), path);
      }
      translations++;
    }
    for (const [key, child] of Object.entries(value)) visit(child, path + '.' + key);
  }
  visit(resource);
  assert.ok(translations > 100);
});
