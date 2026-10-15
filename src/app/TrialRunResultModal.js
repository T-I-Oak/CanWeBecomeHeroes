import ModalLayer from './ModalLayer.js';
import { playTrialResultEntrance } from './TrialResultEntrance.js';
import { createCelebrationConfetti } from './TrialResultConfetti.js';
import { TRIAL_RUN_RESULT_TYPE } from '../game/TrialRunResult.js';
import { ACHIEVEMENT_DEFINITIONS } from '../game/AchievementDefinitions.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { createAchievementTable } from './AchievementTable.js';
import { getTrialResultScale } from './TrialResultScale.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const element = (tag, className) => { const node = document.createElement(tag); node.className = className; return node; };
const signature = '<svg class="Signature" viewBox="0 0 190 65" aria-hidden="true"><text x="12" y="39" fill="currentColor" font-size="37" font-family="Segoe Script, cursive" font-style="italic">Zane</text><path d="M8 50Q65 43 159 48M128 35q18 4 38-7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

/** Presentation uses the immutable ending snapshot, without resaving on flips. */
export default class TrialRunResultModal {
  constructor(container, { textRepository } = {}) {
    if (!container || !textRepository) throw new Error('Trial result modal requires a container and text repository.');
    this.modalLayer = new ModalLayer(container);
    this.container = container;
    this.textRepository = textRepository;
  }
  show(result) {
    return new Promise(resolve => {
      const label = id => this.textRepository.getLabel(id);
      const pass = result.type === TRIAL_RUN_RESULT_TYPE.certificate;
      const language = document.documentElement.lang?.startsWith('en') ? 'en' : 'ja';
      const date = new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' }).format(result.issuedAt);
      const screen = element('section', 'TrialResultViewport');
      const paper = element('div', 'TrialResultPaper');
      const surface = element('article', 'PaperSurface');
      const heading = element('header', 'ResultHeading');
      const content = element('div', 'ResultContent');
      const frame = element('div', 'PaperFrame');
      const actions = element('footer', 'ResultActions');
      const flip = element('button', 'FlipButton');
      flip.type = 'button';
      flip.setAttribute('aria-label', label('trialResultFlip'));
      flip.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 7h9a9 9 0 0 1 0 18h-9M15 20l-5 5 5 5"/></svg>';
      const back = element('button', 'ReturnButton');
      back.type = 'button';
      back.textContent = label('returnToTitle');
      let reverse = false, closed = false, flipping = false;
      let entrance;
      const score = () => {
        const entries = result.achievements.map(entry => {
          const r = ACHIEVEMENT_DEFINITIONS.find(item => item.id === entry.id).resources[language];
          return { categoryId: entry.category, category: r.category, label: r.label,
            condition: r.condition, gradeLabel: entry.label, updated: entry.updated,
            comment: entry.grade ? r.comments[entry.comment - 1] : r.unachieved };
        });
        return createAchievementTable({ mode: 'result', entries, headings: {
          category: label('trialResultCategory'), item: label('trialResultItem'),
          grade: label('trialResultGrade'), comment: label('trialResultComment'),
        } });
      };
      const render = () => {
        heading.innerHTML = `<div class="GuildLabel">${escape(label('trialCertificateIssuer'))}</div><h1 id="trial-run-result-title">${escape(label(reverse ? 'trialResultScoreTitle' : pass ? 'trialCertificateTitle' : 'trialFailureTitle'))}</h1><div class="HeadingRule"></div>`;
        content.className = `ResultContent${reverse ? ' state-score' : ''}`;
        if (reverse) content.replaceChildren(score());
        else if (pass) content.innerHTML = `<p class="Statement">${escape(label('trialCertificateStatement')).replace(/\n/g, '<br>')}</p><ul class="Recipients">${result.members.map(member => `<li><span class="Epithet">${escape(member.epithet)}</span><span class="HeroName">${escape(this.textRepository.getName('hero', member.heroId))}</span></li>`).join('')}</ul><div class="Issue"><div class="IssueText"><p class="IssueDate">${escape(label('trialCertificateDate'))}：${escape(date)}</p><div class="IssuerLine"><div>${escape(label('trialCertificateIssuer'))}<br>${escape(label('trialCertificateChair'))}</div>${signature}</div></div><img class="Seal" src="${resolvePublicAssetPath('/assets/results/trial-guild-seal-v1.png')}" alt="${escape(label('trialCertificateSeal'))}"></div>`;
        else content.innerHTML = `<div class="Failure"><p class="Statement">${escape(label('trialFailureMessage')).replace(/\n/g, '<br>')}</p><div class="Issue"><div class="IssueText">${escape(label('trialFailureDate'))}：${escape(date)}<br>${escape(label('trialCertificateIssuer'))}</div></div></div>`;
        const table = content.querySelector?.('table');
        if (table) {
          let size = 14;
          table.style.fontSize = `${size}px`;
          while ((table.scrollWidth > content.clientWidth - 60 || table.scrollHeight > content.clientHeight) && size > 8) table.style.fontSize = `${size -= .25}px`;
        }
        for (const recipient of content.querySelectorAll?.('.Recipients li') ?? []) {
          const epithet = recipient.querySelector('.Epithet');
          let size = 17;
          while (recipient.scrollWidth > recipient.clientWidth && size > 8) epithet.style.fontSize = `${size -= .25}px`;
        }
      };
      const resize = () => {
        const scale = getTrialResultScale(this.container.clientWidth, this.container.clientHeight);
        paper.style.transform = `translate(-50%,-50%) scale(${scale})`;
      };
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
      back.addEventListener('click', () => {
        closed = true;
        entrance?.dispose();
        observer?.disconnect();
        surface.getAnimations?.().forEach(animation => animation.cancel());
        this.modalLayer.close();
        resolve();
      });
      flip.addEventListener('click', async () => {
        if (flipping || closed) return;
        flipping = true;
        flip.disabled = true;
        const duration = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 350;
        try {
          await surface.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration, easing: 'ease-in', fill: 'forwards' }).finished;
          if (closed) return;
          reverse = !reverse;
          render();
          await surface.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration, easing: 'ease-out', fill: 'forwards' }).finished;
        } catch (error) { if (!closed) throw error; }
        finally { surface.getAnimations?.().forEach(animation => animation.cancel()); flipping = false; flip.disabled = false; }
      });
      paper.setAttribute('role', 'dialog');
      paper.setAttribute('aria-modal', 'true');
      paper.setAttribute('aria-labelledby', 'trial-run-result-title');
      surface.append(frame, heading, content);
      actions.append(flip, back);
      paper.append(surface, actions);
      screen.append(paper);
      if (pass) screen.append(createCelebrationConfetti());
      this.container.replaceChildren(screen);
      this.modalLayer.open();
      render(); resize(); observer?.observe(this.container);
      flip.disabled = true;
      back.disabled = true;
      entrance = playTrialResultEntrance({ paper: surface, container: screen, pass, endText: label('trialResultEnd') });
      entrance.finished.then(() => { if (!closed) { flip.disabled = false; back.disabled = false; } });
    });
  }
}
