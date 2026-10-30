import { TRIAL_RUN_RESULT_TYPE } from '../game/TrialRunResult.js';

const GAME_URL = 'https://t-i-oak.github.io/CanWeBecomeHeroes/';
const MESSAGE_LABELS = {
  [TRIAL_RUN_RESULT_TYPE.certificate]: 'trialResultShareCertificate',
  [TRIAL_RUN_RESULT_TYPE.failureNotice]: 'trialResultShareFailure',
  [TRIAL_RUN_RESULT_TYPE.challengeNotice]: 'trialResultShareChallenge',
};

export function createTrialResultShareText(type, textRepository) {
  const label = MESSAGE_LABELS[type];
  if (!label) throw new RangeError(`Unknown trial result: ${type}`);
  const message = textRepository.getLabel(label);
  return `【Can We Become Heroes?】\n${message}\n${GAME_URL}\n#CanWeBecomeHeroes #GameWorksOAK`;
}

export async function shareTrialResultImage(blob, text, {
  navigatorRef = globalThis.navigator, FileCtor = globalThis.File,
  ClipboardItemCtor = globalThis.ClipboardItem,
} = {}) {
  const desktop = /Windows|Macintosh|Linux/i.test(navigatorRef?.userAgent ?? '') &&
    !/Android|iPhone|iPad|iPod/i.test(navigatorRef?.userAgent ?? '') &&
    !(navigatorRef?.maxTouchPoints > 1 && /Macintosh/i.test(navigatorRef?.userAgent ?? ''));
  if (desktop) {
    if (!navigatorRef.clipboard?.write || !ClipboardItemCtor) throw new Error('Image clipboard is unavailable.');
    await navigatorRef.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
    return 'copied';
  }
  const fileName = 'can-we-become-heroes-result.png';
  const file = FileCtor ? new FileCtor([blob], fileName, { type: 'image/png' }) : null;
  if (file && navigatorRef?.share && navigatorRef.canShare?.({ files: [file] })) {
    try {
      await navigatorRef.share({ files: [file], title: 'Can We Become Heroes?', text });
      return 'shared';
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled';
      throw error;
    }
  }
  throw new Error('Image sharing is unavailable on this device.');
}
