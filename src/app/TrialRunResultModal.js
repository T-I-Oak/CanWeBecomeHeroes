import ModalLayer from './ModalLayer.js';
import { playTrialResultEntrance } from './TrialResultEntrance.js';
import { createCelebrationConfetti } from './TrialResultConfetti.js';
import { TRIAL_RUN_RESULT_TYPE } from '../game/TrialRunResult.js';
import { renderTrialResultPaper } from './TrialResultPaper.js';
import { createTrialResultShareImage } from './TrialResultShareImage.js';
import { shareTrialResultImage, createTrialResultShareText } from './TrialResultShareService.js';
import { getTrialPaperLayout } from './TrialPaperScale.js';
import TrialResultShareConfirm from './TrialResultShareConfirm.js';
const element = (tag, className) => { const node = document.createElement(tag); node.className = className; return node; };

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
      const challenge = result.type === TRIAL_RUN_RESULT_TYPE.challengeNotice;
      const language = document.documentElement.lang?.startsWith('en') ? 'en' : 'ja';
      const screen = element('section', 'TrialResultViewport');
      const paper = element('div', 'TrialResultPaper');
      const scroll = element('div', 'TrialResultScroll');
      const paperFrame = element('div', 'TrialResultFrame');
      let surface;
      const actions = element('footer', 'ResultActions');
      const flip = element('button', 'FlipButton');
      flip.type = 'button';
      flip.setAttribute('aria-label', label('trialResultFlip'));
      flip.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M10 7h9a9 9 0 0 1 0 18h-9M15 20l-5 5 5 5"/></svg>';
      const back = element('button', 'ReturnButton');
      back.type = 'button';
      back.textContent = label('returnToTitle');
      const share = element('button', 'ShareButton');
      share.type = 'button';
      share.textContent = label('trialResultShare');
      const status = element('p', 'ResultShareStatus');
      status.setAttribute('role', 'status');
      let reverse = false, closed = false, flipping = false;
      let entrance;
      const shareConfirm = new TrialResultShareConfirm();
      let preparedImage, sharing = false;
      const prepareImage = () => createTrialResultShareImage(result, this.textRepository, language)
        .then(blob => ({ blob }), error => ({ error }));
      share.addEventListener('click', async () => {
        if (sharing || closed) return;
        sharing = true;
        share.disabled = true;
        status.textContent = label('trialResultSharing');
        resize();
        try {
          const prepared = await (preparedImage ??= prepareImage());
          if (closed) return;
          if (prepared.error) throw prepared.error;
          const text = createTrialResultShareText(result.type, language);
          const mode = await shareTrialResultImage(prepared.blob, text);
          if (closed) return;
          status.textContent = '';
          if (mode === 'copied') await shareConfirm.show(this.textRepository, text);
        } catch (error) {
          console.error('Result sharing failed:', error);
          preparedImage = null;
          if (!closed) status.textContent = label('trialResultShareFailed');
        } finally {
          sharing = false;
          if (!closed) { share.disabled = false; resize(); }
        }
      });
      const render = () => {
        surface = renderTrialResultPaper(paper, result, this.textRepository, language, reverse, 'trial-run-result-title');
      };
      const resize = () => {
        const layout = getTrialPaperLayout(screen.clientWidth - 24, screen.clientHeight - actions.clientHeight - status.clientHeight - 24);
        scroll.style.height = `${layout.height + 24}px`;
        paperFrame.style.width = `${layout.width}px`;
        paperFrame.style.height = `${layout.height}px`;
        paper.style.transform = `scale(${layout.scale})`;
      };
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
      back.addEventListener('click', () => {
        closed = true;
        shareConfirm.close();
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
      screen.setAttribute('role', 'dialog');
      screen.setAttribute('aria-modal', 'true');
      screen.setAttribute('aria-labelledby', 'trial-run-result-title');
      actions.append(flip, share, back);
      paperFrame.append(paper);
      scroll.append(paperFrame);
      screen.append(scroll, actions, status);
      if (pass) screen.append(createCelebrationConfetti());
      this.container.replaceChildren(screen);
      this.modalLayer.open();
      render(); resize(); observer?.observe(this.container);
      preparedImage = prepareImage();
      flip.disabled = true;
      share.disabled = true;
      back.disabled = true;
      entrance = playTrialResultEntrance({ paper: surface, container: screen, pass, announceEnd: !pass, shrinkPaper: pass || challenge, endText: label('trialResultEnd') });
      entrance.finished.then(() => { if (!closed) { flip.disabled = false; share.disabled = false; back.disabled = false; } });
    });
  }
}
