import { ACHIEVEMENT_DEFINITIONS } from './AchievementDefinitions.js';

export function getAchievementLogLabel(textRepository, { id, newGrade }) {
  const definition = ACHIEVEMENT_DEFINITIONS.find(item => item.id === id);
  const language = textRepository.getLabel('documentLanguage').startsWith('en') ? 'en' : 'ja';
  return `${definition.resources[language].label}: ${definition.levels[newGrade - 1].label}`;
}

export function createAchievementNotifier(gameLog, toast) {
  return changes => {
    for (const { id, newGrade } of changes) {
      gameLog.logLocalized({ key: 'logAchievement', values: { achievement: { kind: 'achievement', id, newGrade } } }, { notify: false });
    }
    toast.enqueue(changes);
  };
}
