const BATTLE_SLOT_ORDER = Object.freeze(['battle-2', 'battle-3', 'battle-1', 'battle-4']);
const ACQUAINTANCES = Object.freeze({ Avery: 'Briar', Briar: 'Avery', Casey: 'Darcy', Darcy: 'Casey', Ellis: 'Finley', Finley: 'Ellis', Garnet: 'Harper', Harper: 'Garnet' });

export function selectRecruitmentCast({ members, recruitedHero }) {
  const battleMembers = BATTLE_SLOT_ORDER.flatMap((slotId) => members.filter((hero) => hero.currentArea === 'battle' && hero.currentSlotId === slotId));
  const priority = [...battleMembers, ...members.filter((hero) => !battleMembers.includes(hero))];
  const acquaintance = priority.find((hero) => hero.heroId === ACQUAINTANCES[recruitedHero.heroId]);
  const ordered = acquaintance ? [...priority.filter((hero) => hero !== acquaintance), acquaintance] : priority;
  return Object.fromEntries([...ordered.map((hero, index) => [['A', 'B', 'C'][index], hero.heroId]), ['X', recruitedHero.heroId]]);
}

export function selectRecruitmentContext(context) {
  const cast = selectRecruitmentCast(context);
  return { cast, acquaintance: cast[cast.C ? 'C' : 'B'] === ACQUAINTANCES[cast.X] };
}
