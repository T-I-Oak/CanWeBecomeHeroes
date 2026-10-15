import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync('public/data/epithet.json', 'utf8'));
const words = {
  'キラー':'Killer','一撃必殺の':'Deadly ','賢者':'Sage','秘術の':'Arcane ','を封じる':'seals','韋駄天':'Speed Star','神出鬼没の':'Elusive ','を出し抜く':'outwits','雄弁家':'Orator','高潔なる':'Noble ','を統べる':'commands','聖者':'Saint','神聖なる':'Divine ','の天敵':'Nemesis','番人':'Warden','不動の':'Unyielding ','を打ち砕く':'crushes','名匠':'Master Artisan','結界の':'Warding ','を絡め取る':'ensnares','疾風の':'Swift ','を翻弄する':'bewilders','目利き':'Connoisseur','煌めく':'Radiant ','を魅了する':'enchants','勝負師':'High Roller','天運の':'Fortunate ','に競り勝つ':'outplays','炎の':'Fiery ','を焼き払う':'incinerates','水の':'Aquatic ','を押し流す':'sweeps away','風雲児':'Trailblazer','雷鳴の':'Thunderous ','を撃ち抜く':'pierces','指揮官':'Commander','雄大なる':'Majestic ','を一掃する':'annihilates','不屈の':'Indomitable ','を押し返す':'repels','剣豪':'Swordmaster','一刀両断の':'Cleave-striking ','を討つ':'slays','守護者':'Guardian','鉄壁の':'Invincible ','を打ちのめす':'batters','術師':'Adept','神秘なる':'Mystic ','を打ち払う':'strikes down','祈り手':'Supplicant','聖なる':'Holy ','を祓う':'exorcises','密偵':'Shadow','狡猾なる':'Cunning ','を引き裂く':'rends','スナイパー':'Sniper','百発百中の':'Unerring ','を射抜く':'shoots down','幻術師':'Illusionist','神秘の':'Mysterious ','を幻惑する':'beguiles','旗手':'Standard-bearer','威風堂々たる':'Regal ','を圧倒する':'overwhelms','聖人':'Saint','荘厳なる':'Sublime ','を浄化する':'purifies','占い師':'Seer','強運の':'Lucky ','の運命を操る':'rules the fate of','英傑':'Champion','歴戦の':'Veteran ','買付人':'Trader','黄金の':'Golden ','威厳ある':'Dignified ','修行者':'Ascetic','屈強なる':'Mighty ','華麗なる':'Splendid ','不退転の':'Resolute ','非凡なる':'Exceptional ','使い手':'Master','使者':'Emissary','守り手':'Keeper','勇者':'Hero','強敵':'Formidable Foe','伝説の':'Legendary ','恐るべき':'Fearsome ','を倒す':'defeats',
};
function translate(groups) {
  return Object.fromEntries(Object.entries(groups).map(([key, sides]) => [key, Object.fromEntries(Object.entries(sides).map(([side, list]) => [side, list.map(value => {
    if (value === '[tagSkill]の[skillPerson(ally)]') return '[skillPerson(ally)] of [tagSkill]';
    if (value.startsWith('[')) return value;
    if (!(value in words)) throw new Error(`Missing translation: ${value}`);
    if (key === 'skillPerson' && value === '使い手') return 'Wielder';
    if (key === 'actionPerson' && value === 'キラー') return '[person_base(enemy)] Slayer';
    if (key === 'actionPerson' && value === 'の天敵') return 'Nemesis of [person_base(enemy)]';
    return words[value];
  })]))]));
}
Object.assign(words, { '達人': 'Adept', '名人': 'Master', '匠': 'Artisan' });
data.targets.forEach(target => { target.wordsEn = translate(target.words); });
data.genericEn = translate(data.generic);
data.defaultsEn = Object.fromEntries(Object.entries(data.defaults).map(([key, list]) => [key, list.map(value => value.startsWith('[') ? value : words[value])]));
data.defaultsEn['actionPerson(enemy)'] = ['[person_base(ally)] who [action(enemy)] [person_base(enemy)]', '[modifier(ally)][person_base(ally)] who [action(enemy)] [person_base(enemy)]'];
fs.writeFileSync('public/data/epithet.json', JSON.stringify(data, null, 2) + '\n');
