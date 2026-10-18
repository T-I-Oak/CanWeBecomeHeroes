import { TRIAL_RUN_RESULT_TYPE } from '../game/TrialRunResult.js';

const GAME_URL = 'https://t-i-oak.github.io/CanWeBecomeHeroes/';
const MESSAGES = {
  ja: {
    [TRIAL_RUN_RESULT_TYPE.certificate]: '勇者認定試験に合格しました！',
    [TRIAL_RUN_RESULT_TYPE.failureNotice]: '勇者認定試験に挑戦しました！',
    [TRIAL_RUN_RESULT_TYPE.challengeNotice]: '実力判定試験を終えました！',
  },
  en: {
    [TRIAL_RUN_RESULT_TYPE.certificate]: 'I passed the Hero Certification Exam!',
    [TRIAL_RUN_RESULT_TYPE.failureNotice]: 'I took on the Hero Certification Exam!',
    [TRIAL_RUN_RESULT_TYPE.challengeNotice]: 'I finished the Hero Proficiency Exam!',
  },
};

export function createTrialResultShareText(type, language) {
  const message = MESSAGES[language][type];
  if (!message) throw new RangeError(`Unknown trial result: ${type}`);
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
