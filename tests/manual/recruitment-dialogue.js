import { setLanguage } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import { APP_VERSION } from '../../src/game/AppMetadata.js';
import GameTextRepository from '../../src/game/GameTextRepository.js';
import { selectRecruitmentContext } from '../../src/game/RecruitmentCast.js';
import { createRecruitmentVignette } from '../../src/game/RecruitmentVignette.js';
import { getEnemyDefinitionById } from '../../src/game/EnemyCatalog.js';
import VignetteModal from '../../src/app/VignetteModal.js';
import AssetLoader from '../../src/chips/AssetLoader.js';

const heroIds = ['Avery', 'Briar', 'Casey', 'Darcy', 'Ellis', 'Finley', 'Garnet', 'Harper'];
const recruit = document.querySelector('#recruit');
for (const id of heroIds) recruit.add(new Option(id, id));
const count = document.querySelector('#count');
const memberSelects = ['Briar', 'Casey', 'Darcy'].map((initial, index) => {
  const label = document.createElement('label');
  label.textContent = `メンバー${index + 1} `;
  const select = document.createElement('select');
  select.id = `member-${index + 1}`;
  for (const id of heroIds) select.add(new Option(id, id));
  select.value = initial;
  label.append(select);
  document.querySelector('#members').append(label);
  return select;
});
document.querySelector('#version').textContent = `v${APP_VERSION}`;
const texts = new GameTextRepository();
const assets = new AssetLoader();
const status = document.querySelector('#status');
const modal = new VignetteModal(document.querySelector('#vignette'), { assets, clock: {
  pause: () => { status.textContent = '時計停止中'; },
  resume: () => { status.textContent = '再生終了・時計再開'; },
} });
let scenario;
function refreshSelection() {
  const selected = new Set([recruit.value]);
  const active = memberSelects.slice(0, Number(count.value));
  memberSelects.forEach((select, index) => {
    select.parentElement.hidden = index >= active.length;
    if (selected.has(select.value)) select.value = heroIds.find((id) => !selected.has(id));
    if (index < active.length) selected.add(select.value);
  });
  for (const select of [recruit, ...active]) {
    const otherIds = new Set([recruit, ...active].filter((other) => other !== select).map((other) => other.value));
    for (const option of select.options) {
      option.disabled = otherIds.has(option.value);
      option.textContent = texts.getName('hero', option.value);
    }
  }
  const context = selectRecruitmentContext({ members: active.map((select, index) => ({ heroId: select.value, currentArea: 'battle', currentSlotId: ['battle-2', 'battle-3', 'battle-1'][index] })), recruitedHero: { heroId: recruit.value } });
  const inviter = context.cast[context.cast.C ? 'C' : 'B'];
  document.querySelector('#relationship').textContent = context.acquaintance
    ? `自動判定：${texts.getName('hero', recruit.value)}と${texts.getName('hero', inviter)}は知人 → 登場・誘い・承諾は知人用`
    : '自動判定：加入者の知人なし → 一般用会話';
  document.querySelector('#cast').textContent = `自動配役：${Object.entries(context.cast).map(([role, id]) => `${role}: ${texts.getName('hero', id)}`).join(' / ')}`;
  scenario = createRecruitmentVignette({ ...context, enemies: [{ slotPosition: 3, definition: getEnemyDefinitionById('medium-iron') }], textRepository: texts });
  document.querySelector('#lines').replaceChildren(...scenario.commands.filter((command) => command.type === 'line').map((line) => {
    const item = document.createElement('li');
    item.textContent = `${line.instanceId}・${texts.getName('hero', context.cast[line.instanceId])}: ${line.text}`;
    return item;
  }));
}
async function refreshLanguage() {
  setLanguage(document.querySelector('#language').value);
  await texts.load();
  refreshSelection();
}
await refreshLanguage();
for (const select of [recruit, count, ...memberSelects]) select.addEventListener('change', refreshSelection);
document.querySelector('#language').addEventListener('change', refreshLanguage);
document.querySelector('#play').addEventListener('click', () => modal.play(scenario));
