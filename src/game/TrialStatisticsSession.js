import StatisticsCollector from './StatisticsCollector.js';
import Achievements from './Achievements.js';
import { getHeroProfessionDefinition } from './HeroFactory.js';

export default class TrialStatisticsSession {
  constructor({ repository, professionIds, mode = 'trial', onGradeRaised, startedAt = new Date().toISOString() }) {
    this.mode = mode;
    this.repository = repository;
    this.session = repository.beginRun();
    this.collector = new StatisticsCollector({ ...this.session, achievements: new Achievements(), onGradeRaised });
    this.startedAt = startedAt;
    this.heroIds = professionIds.map(profession => getHeroProfessionDefinition(profession).heroId);
    this.startMembers = professionIds.map((profession, index) => ({ profession, heroId: this.heroIds[index] }));
    this.finishedRecord = null;
    this.record = event => this.collector.record(event);
    this.record({ type: 'run-start', mode: this.mode, heroIds: this.heroIds });
  }

  attachHero(hero) {
    hero.onStatistics = this.record;
    this.record({ type: 'hero-tags', hero });
  }

  checkpoint() {
    this.repository.checkpoint(this.session);
  }

  finish({ outcome, members, tick, remainingHours, endedAt = new Date().toISOString() }) {
    if (this.finishedRecord) return this.finishedRecord;
    this.record({ type: 'run-end', mode: this.mode, heroIds: this.heroIds, outcome: outcome.state });
    const { run } = this.session;
    this.finishedRecord = {
      id: `${this.mode}-${this.session.sequence}-${this.startedAt}`, sequence: this.session.sequence,
      mode: this.mode, startedAt: this.startedAt, endedAt, outcome: outcome.state,
      stageNumber: outcome.stageNumber, stageKind: outcome.stageKind,
      startMembers: structuredClone(this.startMembers),
      members: members.map(({ heroId, profession }) => ({ heroId, profession })),
      elapsedTicks: tick, remainingHours: outcome.state === 'cleared' ? Math.max(0, remainingHours) : 0,
      clearedStages: run.getClearedStageCount(), points: run.data.combat.points, defeats: run.data.combat.defeats,
      statistics: run.exportData(), achievements: this.collector.getRunAchievements(),
    };
    this.repository.complete(this.session, this.finishedRecord);
    return this.finishedRecord;
  }
}
