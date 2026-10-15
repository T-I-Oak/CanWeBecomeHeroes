import { ACHIEVEMENT_DEFINITIONS } from '../src/game/AchievementDefinitions.js';
import { createCelebrationConfetti } from '../src/app/TrialResultConfetti.js';
import { playTrialResultEntrance } from '../src/app/TrialResultEntrance.js';
const $ = id => document.getElementById(id);
let page = 0;
const escape = text => String(text).replace(/[&<>"']/g, value => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[value]));
const seal = `<img class="Seal" src="../assets/results/trial-guild-seal-v1.png" alt="勇者ギルド認定印">`;
const signature = `<svg class="Signature" viewBox="0 0 190 65" aria-label="ゼインのサイン案"><text x="12" y="39" fill="currentColor" font-size="37" font-family="Segoe Script, cursive" font-style="italic">Zane</text><path d="M8 50Q65 43 159 48M128 35q18 4 38-7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
function score() {
  const ids = ['pair-start:Avery|Briar','trial-start','trial-clear','stage-clear','enemy-defeat:small-valor','enemy-defeat:small-iron','enemy-defeat:medium-valor','contribution','facility:shop','facility:guild','tag:valor','tag:arcane'];
  const definitions = ids.map(id => ACHIEVEMENT_DEFINITIONS.find(item => item.id === id)).filter(Boolean).slice(0, 10);
  const grades = ['B+','A','D+','S-','A+','C','B','B+','A','C+','B+','E'];
  // Mixed samples of cumulative grade increases and entries selected by run G.
  const updatedIds = new Set(['trial-clear', 'enemy-defeat:small-valor', 'contribution']);
  let body = '';
  definitions.forEach((definition, index) => {
    const r = definition.resources.ja;
    const first = index === 0 || definitions[index - 1].category !== definition.category;
    let span = 1;
    if (first) while (definitions[index + span]?.category === definition.category) span++;
    const level = definition.levels.find(item => item.label === grades[index]);
    const comment = grades[index] === 'E' ? r.unachieved : r.comments[(level?.comment ?? 1) - 1];
    body += `<tr>${first ? `<td class="Category" rowspan="${span}">${escape(r.category)}</td>` : ''}<td class="Label">${escape(r.label)}</td><td class="Grade${updatedIds.has(definition.id) ? ' state-updated' : ''}">${grades[index]}</td><td class="Comment">${escape(comment)}</td></tr>`;
  });
  return `<table class="ScoreTable ${definitions.length > 8 ? 'state-dense' : ''}"><thead><tr><th>カテゴリ</th><th>評価項目</th><th>判定</th><th>所見</th></tr></thead><tbody>${body}</tbody></table><p class="ScoreNote">表示件数：${definitions.length}項目 ／ 判定と所見は表示確認用サンプル</p>`;
}
function render() {
  const pass = $('outcome').value === 'pass';
  $('content').classList.toggle('state-score', page === 1);
  $('title').textContent = page ? '成績表' : pass ? '勇者認定試験 合格証明書' : '勇者認定試験 結果通知';
  if (page) $('content').innerHTML = score();
  else if (pass) $('content').innerHTML = `<p class="Statement">ここに、下記の者が勇者認定試験に合格したことを証明します。<br>勇者ギルドより、その功績を称える二つ名を授与します。<br>その名に誇りを持ち、人々の希望となることを願います。</p><ul class="Recipients">${[['一撃必殺のキラー','アヴェリー'],['不動の守護者','ブライアー'],['神秘なる賢者','ケイシー'],['歴戦の祈り手','ダーシー']].map(([epithet,name])=>`<li><span class="Epithet">${epithet}</span><span class="HeroName">${name}</span></li>`).join('')}</ul><div class="Issue"><div class="IssueText"><p class="IssueDate">認定日：2026年10月14日</p><div class="IssuerLine"><div>勇者ギルド試験委員会<br>委員長 ギルドマスター ゼイン</div>${signature}</div></div>${seal}</div>`;
  else $('content').innerHTML = `<div class="Failure"><p class="Statement">今回の勇者認定試験では、合格基準に達しなかったため、<br>不合格となりました。<br>再びの挑戦をお待ちしております。</p><div class="Issue"><div class="IssueText">通知日：2026年10月14日<br>勇者ギルド試験委員会</div></div></div>`;
  if (page) fitScoreTable();
}
function fitScoreTable() {
  const table = $('content').querySelector('table');
  const style = getComputedStyle($('content'));
  const available = $('content').clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  let fontSize = 14;
  table.style.fontSize = `${fontSize}px`;
  while ((table.scrollWidth > available + 1 || $('content').scrollHeight > $('content').clientHeight + 1) && fontSize > 8) {
    fontSize -= 0.25;
    table.style.fontSize = `${fontSize}px`;
  }
}
function resize() {
  const viewport = $('viewport');
  const scale = Math.max(0.05, Math.min((viewport.clientWidth - 24) / 840, (viewport.clientHeight - 24) / 600));
  $('paper').style.transform = `translate(-50%,-50%) scale(${scale})`;
}
let flipping = false;
$('flip').addEventListener('click', async () => {
  if (flipping) return;
  flipping = true;
  $('flip').disabled = true;
  $('outcome').disabled = true;

  const surface = $('surface');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reducedMotion ? 0 : 350;
  await surface.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration, easing: 'ease-in', fill: 'forwards' }).finished;
  page = 1 - page;
  render();
  await surface.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration, easing: 'ease-out', fill: 'forwards' }).finished;
  surface.getAnimations().forEach(animation => animation.cancel());
  $('flip').disabled = false;
  $('outcome').disabled = false;

  flipping = false;
});
let entrance;
function updateCelebration() {
  entrance?.dispose();
  document.querySelector('.TrialRunResult__Confetti')?.remove();
  if ($('outcome').value === 'pass') document.body.append(createCelebrationConfetti());
  $('flip').disabled = true;
  $('return').disabled = true;
  entrance = playTrialResultEntrance({ paper: $('surface'), container: $('viewport'), pass: $('outcome').value === 'pass', endText: '試験終了' });
  const current = entrance;
  entrance.finished.then(() => { if (entrance === current) { $('flip').disabled = false; $('return').disabled = false; } });
}
$('outcome').addEventListener('change', () => { page = 0; render(); updateCelebration(); });

$('return').addEventListener('click', () => { window.location.href = '../index.html'; });
window.addEventListener('resize', resize);
render(); resize(); updateCelebration();
