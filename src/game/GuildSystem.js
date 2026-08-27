import { calculateGuildExtension, formatGuildExtensionHours, getGuildExtensionRate } from './GuildTime.js';

export const GUILD_APPLICATION_TICKS = 600;
const GAME_TICK_SECONDS = 1 / 60;

export default class GuildSystem {
  constructor(returnSystem, { getContributionPoints, setContributionPoints, random = Math.random, gameLog = null } = {}) {
    Object.assign(this, { returnSystem, getContributionPoints, setContributionPoints, random, gameLog });
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
    this.gameLog?.log(this.getApplicationMessage(hero, { reputationSkillLevel, isLucky, extensionHours: result.extensionHours }), {
      subject: 'hero',
      level: isLucky ? 'luck' : 'info',
    });
    state.returning = true;
    this.returnSystem.begin(hero);
  }

  getApplicationMessage(hero, { reputationSkillLevel, isLucky, extensionHours }) {
    const name = `【${hero.profession}・${hero.name.ja}】`;
    const prefix = reputationSkillLevel > 0
      ? (isLucky ? 'ギルドとの巧みな交渉で好条件を引き出し' : 'ギルドとの巧みな交渉で')
      : (isLucky ? 'ギルドから好条件を引き出し' : 'ギルドと交渉して');
    return `${name}は${prefix}、試験期限を${formatGuildExtensionHours(extensionHours)}延長した。`;
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
