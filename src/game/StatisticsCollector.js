function normalize(event) {
  if (event.type === 'hero-tags') {
    const counts = {};
    event.hero.getTags().forEach(tag => { counts[tag] = (counts[tag] ?? 0) + 1; });
    return { type: event.type, heroId: event.hero.heroId, counts };
  }
  if (event.type === 'departure') {
    return {
      type: event.type, heroId: event.hero.heroId, facilityId: event.facilityId,
      weapons: event.facilityId === 'battle' ? Object.values(event.hero.equipment).filter(item => item?.category === 'weapon').map(item => item.type) : [],
    };
  }
  return event;
}

export default class StatisticsCollector {
  constructor({ run, total, achievements, onGradeRaised = () => {} }) {
    Object.assign(this, { run, total, achievements, onGradeRaised });
    this.statistics = [run, total];
    const initial = achievements.evaluate(total);
    this.startGrades = { ...initial.grades };
    this.startG = Object.fromEntries(initial.entries.map(({ id, G }) => [id, G]));
    this.previousGrades = { ...this.startGrades };
  }

  record(event) {
    const input = normalize(event);
    this.statistics.forEach(statistics => statistics.record(input));
    const { grades, gained, notices = gained } = this.achievements.evaluate(this.total, this.previousGrades);
    this.previousGrades = grades;
    if (notices.length) this.onGradeRaised(notices);
  }

  getRunAchievements() {
    return this.achievements.evaluateRun({ startGrades: this.startGrades, startG: this.startG, total: this.total, run: this.run });
  }
}
