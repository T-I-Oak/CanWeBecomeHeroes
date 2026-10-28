function emptyData() {
  return { runs: {}, stages: {}, facilities: {}, combat: { defeats: 0, points: 0, enemies: {} }, heroes: {} };
}

function increment(values, key, amount = 1) {
  values[key] = (values[key] ?? 0) + amount;
}

export default class GameStatistics {
  constructor({ data = emptyData(), run = false } = {}) {
    this.data = structuredClone(data);
    this.isRun = run;
  }

  getHero(heroId) {
    return this.data.heroes[heroId] ??= { tags: {}, effectiveTags: {}, weapons: {}, facilities: {}, defeats: {}, shopTags: 0, guildHours: 0, trainingLuck: 0 };
  }

  record(event) {
    const { type } = event;
    if (type === 'run-start' || type === 'run-end') {
      const pairs = this.data.runs[event.mode] ??= {};
      const pair = [...event.heroIds].sort().join('|');
      const counts = pairs[pair] ??= { started: 0, cleared: 0, expired: 0 };
      if (type === 'run-start') counts.started += 1;
      else if (event.outcome === 'cleared') counts.cleared += 1;
      else if (event.outcome === 'expired') counts.expired += 1;
      else if (event.outcome === 'completed') increment(counts, 'completed');
    } else if (type === 'stage-start' || type === 'stage-clear') {
      const key = `${event.kind}:${event.patternIndex}`;
      const stage = this.data.stages[key] ??= { attempts: 0, clears: 0, highestLevel: null };
      if (type === 'stage-start') stage.attempts += 1;
      else {
        stage.clears += 1;
        if (event.level >= (stage.highestLevel ?? 0)) {
          stage.highestLevel = event.level;
          stage.highestLevelClearedAt = event.clearedAt;
        }
      }
    } else if (type === 'defeat') {
      this.data.combat.defeats += 1;
      this.data.combat.points += event.points;
      increment(this.data.combat.enemies, event.enemyId);
      if (this.isRun && event.heroId) {
        const defeat = this.getHero(event.heroId).defeats[event.enemyId] ??= { count: 0, highestLevel: null };
        defeat.count += 1;
        defeat.highestLevel = Math.max(defeat.highestLevel ?? 0, event.level);
      }
    } else if (type === 'departure') {
      increment(this.data.facilities, event.facilityId);
      const hero = this.getHero(event.heroId);
      increment(hero.facilities, event.facilityId);
      if (event.facilityId === 'battle') event.weapons.forEach(weapon => increment(hero.weapons, weapon));
    } else if (type === 'hero-tags') {
      const hero = this.getHero(event.heroId);
      Object.entries(event.counts).forEach(([tag, count]) => { hero.tags[tag] = Math.max(hero.tags[tag] ?? 0, count); });
      Object.entries(event.effectiveCounts).forEach(([tag, count]) => { hero.effectiveTags[tag] = Math.max(hero.effectiveTags[tag] ?? 0, count); });
    } else if (type === 'shop-tags') this.getHero(event.heroId).shopTags += event.count;
    else if (type === 'guild-extension') {
      this.getHero(event.heroId).guildHours += event.hours;
      if (event.consumedPoints !== undefined) this.data.guildPoints = (this.data.guildPoints ?? 0) + event.consumedPoints;
    }
    else if (type === 'training-luck') this.getHero(event.heroId).trainingLuck += 1;
    else throw new RangeError(`Unknown statistics event: ${type}`);
  }

  exportData() {
    return structuredClone(this.data);
  }

  getClearedStageCount() {
    return Object.values(this.data.stages).reduce((sum, stage) => sum + stage.clears, 0);
  }
}
