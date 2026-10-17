import { INITIAL_TRIAL_HOURS } from './GuildTime.js';

const WARNING_DAYS = Object.freeze([3, 2, 1]);
const HOURS_PER_DAY = 24;

export default class TrialDeadlineWarning {
  constructor(gameLog) {
    this.gameLog = gameLog;
    this.previousHours = INITIAL_TRIAL_HOURS;
  }

  update(remainingHours) {
    for (const days of WARNING_DAYS) {
      const threshold = days * HOURS_PER_DAY;
      if (this.previousHours > threshold && remainingHours <= threshold) {
        this.gameLog.logLocalized({ key: 'logTrialDeadlineWarning', values: { days } }, {
          subject: 'system', level: 'warning', channel: 'event',
        });
      }
    }
    this.previousHours = remainingHours;
  }
}
