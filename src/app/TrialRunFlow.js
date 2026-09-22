import { unlockClearedTrialMembers } from '../game/TrialCompletionProgress.js';

export default class TrialRunFlow {
  constructor({ clock, stageController, runController, recruitmentController, heroProgress, getMembers, getRemainingHours, openStageSelection, onRunCompleted = () => {} }) {
    this.clock = clock;
    this.stageController = stageController;
    this.runController = runController;
    this.recruitmentController = recruitmentController;
    this.heroProgress = heroProgress;
    this.getMembers = getMembers;
    this.getRemainingHours = getRemainingHours;
    this.openStageSelection = openStageSelection;
    this.onRunCompleted = onRunCompleted;
  }

  update(heroes) {
    this.recruitmentController.processCompletedStage({
      stage: this.stageController.currentStage,
      stageState: this.stageController.state,
      heroes,
    });
    this.stageController.setJoinedCount(this.recruitmentController.joinedCount);
    const wasRunActive = this.runController.isActive;
    this.runController.update({
      remainingHours: this.getRemainingHours(),
      stage: this.stageController.currentStage,
      stageState: this.stageController.state,
    });
    unlockClearedTrialMembers({
      wasRunActive,
      runController: this.runController,
      members: this.getMembers(),
      heroProgress: this.heroProgress,
    });
    if (!this.runController.isActive) {
      this.clock.pause('run-complete');
      if (wasRunActive) this.onRunCompleted({ outcome: this.runController.getOutcome(), members: this.getMembers() });
    }
    else if (this.stageController.state === 'complete') this.openStageSelection();
  }
}
