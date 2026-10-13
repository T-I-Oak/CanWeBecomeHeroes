import { HERO_PROFESSION_IDS } from './HeroFactory.js';
import { RUN_RECORDS_KEY } from './RunRecordsRepository.js';

export const HERO_PROGRESS_KEY = 'heroProgress';
export const INITIAL_UNLOCKED_PROFESSION_IDS = Object.freeze(['swordfighter', 'guard']);

function validateProfessionId(professionId) {
  if (!HERO_PROFESSION_IDS.includes(professionId)) throw new RangeError(`Unknown hero profession: ${professionId}`);
  return professionId;
}

export default class HeroProgressRepository {
  constructor(dataManager) {
    this.dataManager = dataManager;
  }

  getUnlockedProfessionIds() {
    const progress = this.dataManager.getValue(HERO_PROGRESS_KEY);
    const ids = progress ? progress.unlockedProfessionIds : INITIAL_UNLOCKED_PROFESSION_IDS;
    const recorded = this.dataManager.getValue(RUN_RECORDS_KEY)?.unlockedProfessionIds ?? [];
    return [...new Set([...ids, ...recorded].map(validateProfessionId))];
  }

  unlock(professionId) {
    return this.unlockMany([professionId]);
  }

  unlockMany(professionIds) {
    professionIds.forEach(validateProfessionId);
    const unlockedProfessionIds = this.getUnlockedProfessionIds();
    professionIds.forEach((professionId) => {
      if (!unlockedProfessionIds.includes(professionId)) unlockedProfessionIds.push(professionId);
    });
    const progress = this.dataManager.getValue(HERO_PROGRESS_KEY) ?? {};
    this.dataManager.setValue(HERO_PROGRESS_KEY, { ...progress, unlockedProfessionIds });
    return unlockedProfessionIds;
  }

  recordTrialClear() {
    const progress = this.dataManager.getValue(HERO_PROGRESS_KEY) ?? { unlockedProfessionIds: this.getUnlockedProfessionIds() };
    this.dataManager.setValue(HERO_PROGRESS_KEY, { ...progress, hasClearedTrial: true });
  }

  hasClearedTrial() {
    return this.dataManager.getValue(HERO_PROGRESS_KEY)?.hasClearedTrial === true
      || (this.dataManager.getValue(RUN_RECORDS_KEY)?.clear.count ?? 0) > 0;
  }
}
