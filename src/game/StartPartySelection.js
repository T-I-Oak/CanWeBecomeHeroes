export const STARTING_PARTY_SIZE = 2;

export default class StartPartySelection {
  constructor({ unlockedProfessionIds }) {
    if (unlockedProfessionIds.length < STARTING_PARTY_SIZE) throw new RangeError('Starting a party requires two unlocked heroes.');
    this.unlockedProfessionIds = Object.freeze([...unlockedProfessionIds]);
    this.professionIds = [...unlockedProfessionIds.slice(0, STARTING_PARTY_SIZE)];
  }

  isSelected(professionId) {
    return this.professionIds.includes(professionId);
  }

  selectRosterHero(professionId) {
    if (!this.unlockedProfessionIds.includes(professionId)) throw new RangeError(`Hero is not unlocked: ${professionId}`);
    const [firstProfessionId] = this.professionIds;
    if (professionId === firstProfessionId) return this.professionIds;
    this.professionIds = [professionId, firstProfessionId];
    return this.professionIds;
  }
}
