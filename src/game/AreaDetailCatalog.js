const AREA_DETAILS = Object.freeze({
  preparation: Object.freeze({
    name: 'Home',
    description: 'Heroたちの拠点。待機中のHeroのステータス、装備、タグ、スタミナを確認する。',
  }),
  warehouse: Object.freeze({
    name: 'Warehouse',
    description: '装備を保管する場所。落ちたItemをHeroへ装備させ、行き先Itemもここから選ぶ。',
  }),
  battle: Object.freeze({
    name: 'Battle',
    description: 'HeroとEnemyが自動で戦う場所。Enemyを全滅させると、次の進路を選択できる。',
  }),
});

export function getAreaDetail(area) {
  const detail = AREA_DETAILS[area];
  if (!detail) throw new RangeError(`Unknown area: ${area}`);
  return detail;
}

export { AREA_DETAILS };
