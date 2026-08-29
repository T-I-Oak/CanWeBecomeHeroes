const FACILITY_DETAILS = Object.freeze({
  shop: Object.freeze({
    name: 'Shop',
    description: '買い物袋に入れたItemを売却し、販売中のタグ傾向を持つ装備と交換する施設。右側の黒板は今回と次回の販売傾向を示す。',
  }),
  guild: Object.freeze({
    name: 'Guild',
    description: '貢献ポイントを使い、勇者試験の期限延長を申請する施設。掲示板では残り期限、延長見込、貢献ポイントを確認できる。',
  }),
  training: Object.freeze({
    name: 'Training',
    description: 'スタミナを消費してステータスMAXを鍛える施設。表示されるゲージは今回の訓練で上がったステータスを示す。',
  }),
});

export function getFacilityDetail(facility) {
  const detail = FACILITY_DETAILS[facility];
  if (!detail) throw new RangeError(`Unknown facility: ${facility}`);
  return detail;
}

export { FACILITY_DETAILS };
