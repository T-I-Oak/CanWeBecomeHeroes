export const TRIAL_FINAL_STAGE_NUMBER = 7;

const RUN_STATE = Object.freeze({
  active: 'active',
  cleared: 'cleared',
  expired: 'expired',
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
  constructor() {
    this.state = RUN_STATE.active;
    this.outcome = null;
  }

  get isActive() {
    return this.state === RUN_STATE.active;
  }

  update({ remainingHours, stage, stageState }) {
    if (!this.isActive) return this.state;
    if (isFinalBossVictory(stage, stageState)) this.complete(RUN_STATE.cleared, stage);
    else if (remainingHours <= 0) this.complete(RUN_STATE.expired, stage);
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
