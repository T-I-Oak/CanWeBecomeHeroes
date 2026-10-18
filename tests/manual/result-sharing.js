import { setLanguage } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import GameTextRepository from '../../src/game/GameTextRepository.js';
import { ACHIEVEMENT_DEFINITIONS } from '../../src/game/AchievementDefinitions.js';
import { APP_VERSION } from '../../src/game/AppMetadata.js';
import TrialRunResultModal from '../../src/app/TrialRunResultModal.js';
import { createTrialResultShareImage } from '../../src/app/TrialResultShareImage.js';

const texts = new GameTextRepository();
const language = document.querySelector('#language');
document.querySelector('#version').textContent = `v${APP_VERSION}`;
export async function refreshLanguage() {
  setLanguage(language.value);
  document.documentElement.lang = language.value;
  await texts.load();
}
await refreshLanguage();
language.addEventListener('change', refreshLanguage);

export function sampleResult() {
  const long = document.querySelector('#long-text').checked;
  const epithet = language.value === 'ja' ? '希望を紡ぐ不屈の勇者' : 'The Indomitable Hero Who Weaves Hope';
  return {
    type: document.querySelector('#outcome').value,
    stageNumber: 8, issuedAt: new Date('2026-10-18T03:00:00Z'),
    members: ['Avery', 'Briar', 'Casey', 'Darcy'].map(heroId => ({ heroId, epithet: long ? epithet.repeat(4) : epithet })),
    achievements: ACHIEVEMENT_DEFINITIONS.slice(0, 10).map((entry, index) => ({
      id: entry.id, category: entry.category, label: index % 2 ? 'S+' : 'E',
      grade: index % 2 ? 4 : 0, comment: 1, updated: index % 2 === 1,
    })),
  };
}
document.querySelector('#show-result').addEventListener('click', async () => {
  await refreshLanguage();
  new TrialRunResultModal(document.querySelector('#trial-run-result'), { textRepository: texts }).show(sampleResult());
});
let previewUrl;
document.querySelector('#preview-image').addEventListener('click', async () => {
  const status = document.querySelector('#preview-status');
  status.textContent = '生成中…';
  try {
    await refreshLanguage();
    const blob = await createTrialResultShareImage(sampleResult(), texts, language.value);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    const preview = document.querySelector('#share-preview');
    preview.src = previewUrl;
    preview.hidden = false;
    status.textContent = '1776 × 2680 PNG';
  } catch (error) { status.textContent = String(error); }
});
