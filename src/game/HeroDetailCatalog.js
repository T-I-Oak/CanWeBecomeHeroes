export const HERO_DETAILS = Object.freeze({
  Avery: Object.freeze({
    description: '幼なじみのブライアーと、どちらが先に勇者になるか競ってきた。格好よく決めたい気持ちは誰より強く、困っている人は放っておけない。',
    combatStyle: '真っ向から斬り込む、物理攻撃の得意手。',
  }),
  Briar: Object.freeze({
    description: '幼なじみのアヴェリーに置いていかれまいと、勇者試験を受けた。慎重に周囲を見ているが、勝負となれば決して譲らない。',
    combatStyle: '物理攻撃を受け止め、仲間を守る。',
  }),
  Casey: Object.freeze({
    description: '机上の術式より、実地で確かめる方が好き。未知の魔法と出会うため、危険も多い勇者試験へ飛び込んだ。',
    combatStyle: '守りをすり抜ける、強力な魔法攻撃を放つ。',
  }),
  Darcy: Object.freeze({
    description: '困っている人を見過ごせない。もっと遠くの誰かにも手を伸ばせるよう、勇者になる道を選んだ。',
    combatStyle: '仲間が受けた炎・水・雷の影響を和らげる。',
  }),
  Ellis: Object.freeze({
    description: '昔は小遣い稼ぎに盗みもしたが、悪い相手から大事な物を取り返した時の方が、ずっと気分がよかった。自分の手癖を胸を張れる仕事へ変えたくて、勇者試験に紛れ込んだ。',
    combatStyle: '相手の装備を盗み、戦力を崩す。',
  }),
  Finley: Object.freeze({
    description: '山で迷子を見つけて連れ帰ったことがある。危険な場所でも誰かを見つけ出すため、勇者試験に挑む。',
    combatStyle: '誰より早く動けるが、力押しは苦手。',
  }),
  Garnet: Object.freeze({
    description: '必要な物が必要な場所へ届かない場面を見てきた。もっと遠くまで品物と助けを運ぶため、勇者を目指す。',
    combatStyle: '宝珠で相手の動きを鈍らせる。買い物も得意。',
  }),
  Harper: Object.freeze({
    description: '言葉で減らせる争いは多いと信じる。誰にでも届く発言力を得るため、勇者の肩書きを目指している。',
    combatStyle: '仲間の行動を早め、ギルドとの交渉も有利に進める。',
  }),
});

export function getHeroDetail(hero) {
  return HERO_DETAILS[typeof hero === 'string' ? hero : hero?.name?.en] ?? null;
}
