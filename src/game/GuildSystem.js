import { logText, entityText } from './LocalizedLog.js';
import { calculateGuildExtension, getGuildExtensionRate } from './GuildTime.js';

export const GUILD_APPLICATION_TICKS = 600;
export const GUILD_STAMINA_DRAIN_INTERVAL_TICKS = 20;
export const GUILD_STAMINA_DRAIN = 0.1;
const GAME_TICK_SECONDS = 1 / 60;

export default class GuildSystem {
  constructor(returnSystem, { getContributionPoints, setContributionPoints, random = Math.random, textRepository = null, gameLog = null } = {}) {
    Object.assign(this, { returnSystem, getContributionPoints, setContributionPoints, random, gameLog, textRepository });
    this.elapsed = 0;
    this.extensionHours = 0;
    this.states = new Map();
  }

  update(heroes, deltaSeconds) {
    this.elapsed += deltaSeconds;
    while (this.elapsed + 0.000000001 >= GAME_TICK_SECONDS) {
      this.elapsed -= GAME_TICK_SECONDS;
      heroes.forEach((hero) => this.updateHeroTick(hero));
    }
    heroes.forEach((hero) => this.updateReturn(hero));
  }

  updateHeroTick(hero) {
    const state = this.states.get(hero);
    if (state?.returning) return;
    if (hero.currentArea !== 'guild') {
      this.states.delete(hero);
      return;
    }
    const application = state ?? { ticks: 0, returning: false };
    this.states.set(hero, application);
    application.ticks += 1;
    if (application.ticks % GUILD_STAMINA_DRAIN_INTERVAL_TICKS === 0) hero.stamina = Math.max(0, hero.stamina - GUILD_STAMINA_DRAIN);
    if (application.ticks < GUILD_APPLICATION_TICKS) return;
    this.completeApplication(hero, application);
  }

  completeApplication(hero, state) {
    const reputationSkillLevel = hero.getTagSkillLevel('reputation');
    const isLucky = this.random() < hero.getLuckDegree();
    const result = calculateGuildExtension({
      contributionPoints: this.getContributionPoints(),
      reputationSkillLevel,
      isLucky,
    });
    this.setContributionPoints(Math.max(0, this.getContributionPoints() - result.consumedPoints));
    this.extensionHours += result.extensionHours;
    logText(this.gameLog, this.textRepository, `logGuild${reputationSkillLevel > 0 ? 1 : 0}${isLucky ? 1 : 0}`, { hero: entityText(hero), hours: { kind: 'label', id: 'hours', values: { hours: Math.round(result.extensionHours * 10) / 10 } } }, {
      subject: 'hero',
      level: isLucky ? 'luck' : 'info',
      channel: 'guild',
    });
    state.returning = true;
    this.returnSystem.begin(hero);
  }

  getExtensionHours() {
    return this.extensionHours;
  }

  getEstimatedRate(hero) {
    return getGuildExtensionRate({ reputationSkillLevel: hero?.getTagSkillLevel('reputation') ?? 0 });
  }

  updateReturn(hero) {
    const state = this.states.get(hero);
    if (state?.returning && this.returnSystem.update(hero)) this.states.delete(hero);
  }
}
