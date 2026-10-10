import { unlockClearedTrialMembers } from '../game/TrialCompletionProgress.js';
import { getHeroProfessionDefinition } from '../game/HeroFactory.js';

export default class TrialRunFlow {
  constructor({ clock, stageController, runController, recruitmentController, heroProgress, getMembers, getRemainingHours, openStageSelection, onRunCompleted = () => {}, playRecruitmentVignette = async () => {} }) {
    this.clock = clock;
    this.stageController = stageController;
    this.runController = runController;
    this.recruitmentController = recruitmentController;
    this.heroProgress = heroProgress;
    this.getMembers = getMembers;
    this.getRemainingHours = getRemainingHours;
    this.openStageSelection = openStageSelection;
    this.onRunCompleted = onRunCompleted;
    this.playRecruitmentVignette = playRecruitmentVignette;
    this.recruitmentPlaybackPending = false;
  }

  update(heroes) {
    if (this.recruitmentPlaybackPending) return;
    const previousMembers = [...this.getMembers()];
    const recruitment = this.recruitmentController.prepareCompletedStage({
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
    else if (recruitment?.reason === 'candidate-selected') {
      const recruitedHero = { profession: recruitment.candidateProfession, heroId: getHeroProfessionDefinition(recruitment.candidateProfession).heroId };
      this.recruitmentPlaybackPending = true;
      this.playRecruitmentVignette({ members: previousMembers, recruitedHero, stage: this.stageController.currentStage })
        .then(() => {
          this.recruitmentController.commitRecruitment(recruitment);
          this.stageController.setJoinedCount(this.recruitmentController.joinedCount);
          this.recruitmentPlaybackPending = false;
          this.openStageSelection();
        });
    }
    else if (this.stageController.state === 'complete') this.openStageSelection();
  }
}
