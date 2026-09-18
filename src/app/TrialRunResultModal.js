import ModalLayer from './ModalLayer.js';
import { createModalDialog } from './ModalDialog.js';
import { TRIAL_RUN_RESULT_TYPE } from '../game/TrialRunResult.js';

const CONFETTI_PIECES = Object.freeze([
  ['8%', '#f0cb79', '0ms'], ['15%', '#d75c76', '110ms'], ['22%', '#72b7e6', '230ms'],
  ['31%', '#8ccd7b', '70ms'], ['40%', '#f0cb79', '300ms'], ['51%', '#c685d8', '160ms'],
  ['61%', '#72b7e6', '260ms'], ['70%', '#d75c76', '30ms'], ['80%', '#8ccd7b', '200ms'], ['90%', '#f0cb79', '340ms'],
]);

function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

function createCelebrationConfetti() {
  const confetti = createElement('div', 'TrialRunResult__Confetti');
  confetti.setAttribute('aria-hidden', 'true');
  CONFETTI_PIECES.forEach(([position, color, delay]) => {
    const piece = createElement('span', 'TrialRunResult__ConfettiPiece');
    piece.style.setProperty('--trial-result-confetti-position', position);
    piece.style.setProperty('--trial-result-confetti-color', color);
    piece.style.setProperty('--trial-result-confetti-delay', delay);
    confetti.append(piece);
  });
  return confetti;
}

function formatRecognitionDate(date) {
  return new Intl.DateTimeFormat(document.documentElement.lang || 'ja', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
}

/** Displays a terminal trial outcome. It owns the presentation only. */
export default class TrialRunResultModal {
  constructor(container, { textRepository } = {}) {
    if (!container || !textRepository) throw new Error('Trial result modal requires a container and text repository.');
    this.modalLayer = new ModalLayer(container);
    this.container = this.modalLayer.container;
    this.textRepository = textRepository;
  }

  show(result) {
    this.container.replaceChildren(this.createResult(result));
    this.modalLayer.open();
  }

  createResult(result) {
    if (result.type === TRIAL_RUN_RESULT_TYPE.certificate) return this.createCertificate(result);
    if (result.type === TRIAL_RUN_RESULT_TYPE.failureNotice) return this.createFailureNotice();
    throw new RangeError(`Unknown trial result type: ${result.type}`);
  }

  createCertificate(result) {
    const { dialog, header, body } = createModalDialog({
      dialogClass: 'TrialRunResult__Dialog state-certificate',
      title: this.textRepository.getLabel('trialCertificateTitle'),
      titleId: 'trial-run-result-title',
    });
    const certificate = createElement('article', 'TrialRunResult__Certificate');
    const statement = createElement('p', 'TrialRunResult__Statement', this.textRepository.getLabel('trialCertificateStatement'));
    const recipients = createElement('ul', 'TrialRunResult__RecipientList');
    result.members.forEach((member) => recipients.append(createElement('li', 'TrialRunResult__Recipient', this.textRepository.getName('hero', member.heroId))));
    const issue = createElement('div', 'TrialRunResult__Issue');
    issue.append(
      createElement('time', 'TrialRunResult__Date', `${this.textRepository.getLabel('trialCertificateDate')}: ${formatRecognitionDate(result.issuedAt)}`),
      createElement('p', 'TrialRunResult__Issuer', this.textRepository.getLabel('trialCertificateIssuer')),
      createElement('span', 'TrialRunResult__Seal', this.textRepository.getLabel('trialCertificateSeal')),
    );
    certificate.append(statement, recipients, issue);
    body.append(certificate);
    dialog.append(header, body);
    const resultScreen = createElement('section', 'TrialRunResult__Screen state-certificate');
    resultScreen.append(createCelebrationConfetti(), dialog);
    return resultScreen;
  }

  createFailureNotice() {
    const { dialog, header, body } = createModalDialog({
      dialogClass: 'TrialRunResult__Dialog state-failure-notice',
      title: this.textRepository.getLabel('trialFailureTitle'),
      titleId: 'trial-run-result-title',
    });
    body.append(createElement('p', 'TrialRunResult__FailureMessage', this.textRepository.getLabel('trialFailureMessage')));
    dialog.append(header, body);
    const resultScreen = createElement('section', 'TrialRunResult__Screen state-failure-notice');
    resultScreen.append(dialog);
    return resultScreen;
  }
}
