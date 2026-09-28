import resource from '../src/game/readGameText.js';

function resolve(value, language) {
  if (!value || typeof value !== 'object') return value;
  if (value['lang-store']) return resolve(value['lang-store'][language], language);
  if (Array.isArray(value)) return value.map(child => resolve(child, language));
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolve(child, language)]));
}
function sentence(value, text) {
  if (!Array.isArray(value)) return value ?? '';
  return value.map(token => typeof token === 'string' ? token : token.type === 'reference'
    ? '[' + (text.information[token.kind === 'enemy-definition' ? 'enemy' : token.kind]?.[token.id]?.name ?? token.id) + ']'
    : token.value ?? '').join('');
}
for (const language of ['ja', 'en']) {
  const text = resolve(resource, language);
  console.log('\nLANGUAGE: ' + language);
  for (const [kind, entries] of Object.entries(text.information)) {
    for (const [id, detail] of Object.entries(entries)) {
      console.log(kind + '/' + id + ': ' + detail.name);
      for (const key of ['flavor', 'description', 'combatStyle', 'effectDescription', 'skillNames']) {
        if (detail[key]) console.log(key + ': ' + sentence(detail[key], text));
      }
    }
  }
}
