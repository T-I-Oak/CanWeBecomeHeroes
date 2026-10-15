import fs from 'node:fs';
import { TAG_ORDER, TAGS } from '../src/game/TagCatalog.js';
const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const rows = path => read(path).split(/\r?\n/).filter(line => /^\| (タグ|武器|施設) \|/.test(line)).map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
const names = kind => JSON.parse(read(`public/data/text/information/${kind}.json`));
const tagNames = names('tag');
const weaponNames = names('item');
const enemyNames = names('enemy');
const weaponIds = ['sword', 'shield', 'staff', 'holy-book', 'claw', 'bow', 'orb', 'banner', 'holy-symbol', 'tarot-cards'];
const facilityNames = ['試験場への出発回数', 'ショップへの出発回数', 'ギルドへの出発回数', '訓練場への出発回数', 'ショップのタグ追加数', 'ギルドの期限延長時間', '訓練の幸運成功回数'];
const groupIds = { 'タグ': 'tag', '武器': 'weapon', '施設': 'facility' };
const targets = [
  ...TAG_ORDER.map(id => ({ id, group: 'tag', name: tagNames[id].name['lang-store'].ja, words: {} })),
  ...weaponIds.map(id => ({ id, group: 'weapon', name: weaponNames[id].name['lang-store'].ja, words: {} })),
  ...facilityNames.map((name, index) => ({ id: `facility-${index}`, group: 'facility', name, words: {} })),
];
for (const [group, name, value] of rows('docs/planning/phase_feature_v0.44-epithet_person_ally.md')) {
  const target = targets.find(item => item.group === groupIds[group] && item.name === name);
  if (target && value !== '—') target.words.person_base = { ally: [value.replace('（英語：Speed Star）', '')] };
}
for (const [group, name, value] of rows('docs/planning/phase_feature_v0.44-epithet_modifier_ally.md')) {
  const target = targets.find(item => item.group === groupIds[group] && item.name === name);
  if (target && value !== '—') target.words.modifier = { ally: [value] };
}
const actionNames = {
  信用: 'を統べる', 魔導: 'を封じる', 軽業: 'を出し抜く', 鉄: 'を打ち砕く', 布: 'を絡め取る', 羽: 'を翻弄する', 炎: 'を焼き払う', 水: 'を押し流す', 雷: 'を撃ち抜く', 宝石: 'を魅了する', 幸運: 'に競り勝つ', 範囲: 'を一掃する', 活力: 'を押し返す',
  剣: 'を討つ', 盾: 'を打ちのめす', 杖: 'を打ち払う', 聖書: 'を祓う', 爪: 'を引き裂く', 弓: 'を射抜く', 宝珠: 'を幻惑する', 旗: 'を圧倒する', 聖印: 'を浄化する', タロット: 'の運命を操る',
};
for (const target of targets) {
  if (target.group === 'tag' && TAGS[target.id].group === 'status') {
    target.words.person_base ??= { ally: [] };
    target.words.person_base.ally.push('[tagSkill]の[skillPerson(ally)]');
  }
  if (actionNames[target.name]) target.words.action = { enemy: [actionNames[target.name]] };
  if (target.id === 'valor') target.words.actionPerson = { enemy: ['キラー'] };
  if (target.id === 'blessing') target.words.actionPerson = { enemy: ['の天敵'] };
}
const data = {
  note: '日本語の検討用データ。語句は生成結果を見ながら調整します。深さ制限はありません。',
  template: '[person(ally)]', targets,
  enemies: Object.entries(enemyNames).filter(([id]) => id !== 'phantom-area-head').map(([id, entry]) => ({ id, name: entry.name['lang-store'].ja })),
  generic: { person: { ally: ['[person_base(ally)]', '[modifier(ally)][person_base(ally)]', '[modifier(ally)][qualifiedPerson(ally)]'], enemy: ['[person_base(enemy)]', '[modifier(enemy)][person_base(enemy)]'] }, qualifiedPerson: { ally: ['使い手', '使者', '守り手'] } },
  defaults: { 'person_base(ally)': ['勇者'], 'person_base(enemy)': ['強敵'], 'modifier(ally)': ['伝説の'], 'modifier(enemy)': ['恐るべき'], 'action(enemy)': ['を倒す'], 'actionPerson(enemy)': ['[action(enemy)][person_base(ally)]', '[action(enemy)][modifier(ally)][person_base(ally)]'] },
};
data.generic.skillPerson = { ally: ['使い手', '達人', '名人', '匠'] };
fs.writeFileSync(new URL('scripts/phase_epithet_simulator_data.json', root), JSON.stringify(data, null, 2) + '\n');
console.log(`シミュレーション用データ: ${targets.length}情報種別、${data.enemies.length}敵`);
