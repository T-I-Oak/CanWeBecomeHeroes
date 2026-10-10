const BATTLE_SLOT_ORDER = Object.freeze(['battle-2', 'battle-3', 'battle-1', 'battle-4']);

export function selectRecruitmentCast({ members, recruitedHero }) {
  const battleMembers = BATTLE_SLOT_ORDER.flatMap((slotId) => members.filter((hero) => hero.currentArea === 'battle' && hero.currentSlotId === slotId));
  const ordered = [...battleMembers, ...members.filter((hero) => !battleMembers.includes(hero))];
  return Object.fromEntries([...ordered.map((hero, index) => [['A', 'B', 'C'][index], hero.heroId]), ['X', recruitedHero.heroId]]);
}
