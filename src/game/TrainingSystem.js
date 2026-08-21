import FacilityReturnSystem from './FacilityReturnSystem.js';

export const TRAINING_INTERVAL_TICKS = 200;
const GAME_TICK_SECONDS = 1 / 60;
const STAT_KEYS = Object.freeze(['power', 'magic', 'speed', 'negotiation', 'luck', 'stamina']);
const STAT_LABELS = Object.freeze({ power: 'パワー', magic: '魔力', speed: 'スピード', negotiation: '交渉力', luck: '運', stamina: 'スタミナ' });
const MAXIMUM_STAT_VALUE = 7;

export default class TrainingSystem {
  constructor(board, slotManager, { onItemReturned = () => {}, random = Math.random, gameLog = null, returnSystem = null } = {}) {
    this.board = board;
    this.slotManager = slotManager;
    this.onItemReturned = onItemReturned;
    this.random = random;
    this.gameLog = gameLog;
    this.returnSystem = returnSystem ?? new FacilityReturnSystem(board, slotManager, { onItemReturned, random });
    this.elapsed = 0;
    this.states = new Map();
  }

  update(heroes, deltaSeconds) {
    this.elapsed += deltaSeconds;
    while (this.elapsed >= GAME_TICK_SECONDS) {
      this.elapsed -= GAME_TICK_SECONDS;
      heroes.forEach((hero) => this.updateHeroTick(hero));
    }
    heroes.forEach((hero) => this.updateReturn(hero));
  }

  updateHeroTick(hero) {
    const state = this.states.get(hero);
    if (state?.returning) return;
    if (hero.currentArea !== 'training') {
      this.states.delete(hero);
      return;
    }
    const trainingState = state ?? { ticks: 0, returning: false };
    this.states.set(hero, trainingState);
    trainingState.ticks += 1;
    if (trainingState.ticks < TRAINING_INTERVAL_TICKS) return;
    trainingState.ticks = 0;
    this.train(hero, trainingState);
  }

  train(hero, state) {
    const candidates = STAT_KEYS
      .filter((stat) => hero.maximums[stat] < MAXIMUM_STAT_VALUE)
      .map((stat) => ({ stat, weight: stat === 'stamina' ? hero.stamina : hero.getStatus(stat) }))
      .filter((candidate) => candidate.weight > 0);
    const totalWeight = candidates.reduce((total, candidate) => total + candidate.weight, 0);
    if (totalWeight === 0) {
      this.beginReturn(hero, state);
      return;
    }

    let selection = this.random() * totalWeight;
    const selected = candidates.find((candidate) => {
      selection -= candidate.weight;
      return selection < 0;
    }) ?? candidates.at(-1);
    const isLucky = this.random() < hero.getLuckRate();
    const staminaCost = isLucky ? 1 : 2;
    if (hero.stamina < staminaCost) {
      hero.stamina = 0;
      this.beginReturn(hero, state);
      return;
    }
    hero.stamina -= staminaCost;
    hero.maximums[selected.stat] = Math.min(MAXIMUM_STAT_VALUE, hero.maximums[selected.stat] + 1);
    this.gameLog?.log(`${hero.profession}・${hero.name.ja}は${STAT_LABELS[selected.stat]}を強化した。`, { subject: 'hero', level: isLucky ? 'luck' : 'info' });
  }

  beginReturn(hero, state) {
    if (this.returnSystem) this.returnSystem.begin(hero);
    else throw new Error('Training hero requires a facility return system.');
    state.returning = true;
  }

  updateReturn(hero) {
    const state = this.states.get(hero);
    if (state?.returning && this.returnSystem.update(hero)) this.states.delete(hero);
  }
}
