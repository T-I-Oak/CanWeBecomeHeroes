export const TRIAL_FINAL_STAGE_NUMBER = 7;

const RUN_STATE = Object.freeze({
  active: 'active',
  cleared: 'cleared',
  expired: 'expired',
  completed: 'completed',
});

function isFinalBossVictory(stage, stageState) {
  return stage?.number === TRIAL_FINAL_STAGE_NUMBER
    && stage.kind === 'boss'
    && ['victory', 'complete'].includes(stageState);
}

function createOutcome(state, stage) {
  return Object.freeze({
    state,
    stageNumber: stage?.number ?? null,
    stageKind: stage?.kind ?? null,
  });
}

export default class RunController {
  constructor({ mode = 'trial' } = {}) {
    this.mode = mode;
    this.state = RUN_STATE.active;
    this.outcome = null;
  }

  get isActive() {
    return this.state === RUN_STATE.active;
  }

  update({ remainingHours, stage, stageState }) {
    if (!this.isActive) return this.state;
    if (this.mode === 'trial' && isFinalBossVictory(stage, stageState) && (stageState === 'complete' || remainingHours <= 0)) this.complete(RUN_STATE.cleared, stage);
    else if (remainingHours <= 0) this.complete(this.mode === 'challenge' ? RUN_STATE.completed : RUN_STATE.expired, stage);
    return this.state;
  }

  complete(state, stage) {
    this.state = state;
    this.outcome = createOutcome(state, stage);
  }

  getOutcome() {
    return this.outcome;
  }
}
