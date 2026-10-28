import { TRIAL_RUN_RESULT_TYPE } from '../game/TrialRunResult.js';
import { ACHIEVEMENT_DEFINITIONS } from '../game/AchievementDefinitions.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { createAchievementTable } from './AchievementTable.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const element = (tag, className) => { const node = document.createElement(tag); node.className = className; return node; };
const signature = '<svg class="Signature" viewBox="0 0 190 65" aria-hidden="true"><text x="12" y="39" fill="currentColor" font-size="37" font-family="Segoe Script, cursive" font-style="italic">Zane</text><path d="M8 50Q65 43 159 48M128 35q18 4 38-7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

export function renderTrialResultPaper(paper, result, textRepository, language, reverse = false, headingId = null) {
  const label = id => textRepository.getLabel(id);
  const pass = result.type === TRIAL_RUN_RESULT_TYPE.certificate;
  const challenge = result.type === TRIAL_RUN_RESULT_TYPE.challengeNotice;
  const date = new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' }).format(result.issuedAt);
  const surface = paper.querySelector('.PaperSurface') ?? element('article', 'PaperSurface');
  const frame = element('div', 'PaperFrame');
  const heading = element('header', 'ResultHeading');
  const content = element('div', 'ResultContent');
  surface.replaceChildren(frame, heading, content);
  paper.replaceChildren(surface);
  const score = () => {
    const entries = result.achievements.map(entry => {
      const r = ACHIEVEMENT_DEFINITIONS.find(item => item.id === entry.id).resources[language];
      return { categoryId: entry.category, category: r.category, label: r.label,
        gradeLabel: entry.label, updated: entry.updated,
        comment: entry.grade ? r.comments[entry.comment - 1] : r.unachieved };
    });
    return createAchievementTable({ mode: 'result', entries, headings: {
      category: label('trialResultCategory'), item: label('trialResultItem'),
      grade: label('trialResultGrade'), comment: label('trialResultComment'),
    } });
  };
  const render = () => {
    heading.innerHTML = `<div class="GuildLabel">${escape(label('trialCertificateIssuer'))}</div><h1${headingId ? ` id="${escape(headingId)}"` : ''}>${escape(label(reverse ? 'trialResultScoreTitle' : challenge ? 'challengeResultTitle' : pass ? 'trialCertificateTitle' : 'trialFailureTitle'))}</h1><div class="HeadingRule"></div>`;
    content.className = `ResultContent${reverse ? ' state-score' : ''}`;
    if (reverse) content.replaceChildren(score());
    else if (challenge) content.innerHTML = `<p class="Statement">${escape(textRepository.getLabel('challengeResultMessage', { number: result.stageNumber })).replace(/\n/g, '<br>')}</p><ul class="Recipients">${result.members.map(member => `<li><span class="Epithet">${escape(member.epithet)}</span><span class="HeroName">${escape(textRepository.getName('hero', member.heroId))}</span></li>`).join('')}</ul><div class="Issue"><div class="IssueText"><p class="IssueDate">${escape(label('challengeResultDate'))}：${escape(date)}</p>${escape(label('trialCertificateIssuer'))}</div></div>`;
    else if (pass) content.innerHTML = `<p class="Statement">${escape(label('trialCertificateStatement')).replace(/\n/g, '<br>')}</p><ul class="Recipients">${result.members.map(member => `<li><span class="Epithet">${escape(member.epithet)}</span><span class="HeroName">${escape(textRepository.getName('hero', member.heroId))}</span></li>`).join('')}</ul><div class="Issue"><div class="IssueText"><p class="IssueDate">${escape(label('trialCertificateDate'))}：${escape(date)}</p><div class="IssuerLine"><div>${escape(label('trialCertificateIssuer'))}<br>${escape(label('trialCertificateChair'))}</div>${signature}</div></div><img class="Seal" src="${resolvePublicAssetPath('/assets/results/trial-guild-seal-v1.png')}" alt="${escape(label('trialCertificateSeal'))}"></div>`;
    else content.innerHTML = `<div class="Failure"><p class="Statement">${escape(label('trialFailureMessage')).replace(/\n/g, '<br>')}</p><div class="Issue"><div class="IssueText">${escape(label('trialFailureDate'))}：${escape(date)}<br>${escape(label('trialCertificateIssuer'))}</div></div></div>`;
    const body = element('div', 'ResultContentBody');
    body.append(...content.childNodes);
    content.replaceChildren(body);
    const style = getComputedStyle(content);
    const height = content.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const width = content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const scale = Math.min(1, height / body.scrollHeight, width / body.scrollWidth);
    body.style.transform = `scale(${scale})`;
  };
  render();
  return surface;
}
