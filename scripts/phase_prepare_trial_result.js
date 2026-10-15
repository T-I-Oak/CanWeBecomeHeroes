import fs from 'node:fs';
const source = fs.readFileSync('scripts/phase_trial_result_mockup.css', 'utf8');
let css = '.TrialResultViewport{position:absolute;inset:0;overflow:hidden}\n';
for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
 let selector=match[1].trim();
 if(selector.includes('Preview') || selector.includes('@') || selector.includes('html') || selector==='*' || selector==='body') continue;
 selector=selector.split(',').map(part=>part.trim().startsWith('.ResultPaper') ? part.trim().replace('.ResultPaper','.TrialResultPaper') : '.TrialResultPaper '+part.trim()).join(',');
 selector=selector.replaceAll('#flip','.FlipButton');
 css+=selector+'{'+match[2]+'}\n';
}
css+='\n.TrialResultPaper{color:#392f24;font-family:"Yu Mincho","Hiragino Mincho ProN",Georgia,serif;box-sizing:border-box}.TrialResultPaper *{box-sizing:border-box}.TrialResultPaper .ResultContent{overflow:hidden}.TrialResultPaper .Statement{white-space:normal}.TrialResultPaper .Epithet{letter-spacing:0}.TrialResultPaper .Recipients li{white-space:nowrap}.TrialResultPaper .HeroName{flex-shrink:0}\n';
fs.writeFileSync('src/styles/trial_result.css',css);
const ui=JSON.parse(fs.readFileSync('public/data/text/ui.json','utf8'));
const add=(id,ja,en)=>ui[id]={'lang-store':{ja,en}};
add('trialCertificateStatement','ここに、下記の者が勇者認定試験に合格したことを証明します。\n勇者ギルドより、その功績を称える二つ名を授与します。\nその名に誇りを持ち、人々の希望となることを願います。','This certifies that the following individuals have passed the Hero Certification Trial.\nThe Hero Guild grants each a title in recognition of their achievements.\nMay they bear that name with pride and bring hope to the people.');
add('trialCertificateChair','委員長 ギルドマスター ゼイン','Chairman and Guild Master Zane');
add('trialFailureTitle','勇者認定試験 結果通知','Hero Certification Trial Results');
add('trialFailureMessage','今回の勇者認定試験では、合格基準に達しなかったため、\n不合格となりました。\n再びの挑戦をお待ちしております。','You did not meet the passing standard in this Hero Certification Trial.\nWe look forward to your next attempt.');
add('trialFailureDate','通知日','Date of notice');
add('trialResultScoreTitle','成績表','Report Card');
add('trialResultFlip','裏返す','Turn over');
add('trialResultCategory','カテゴリ','Category'); add('trialResultItem','評価項目','Achievement'); add('trialResultGrade','判定','Grade'); add('trialResultComment','所見','Comment');
fs.writeFileSync('public/data/text/ui.json',JSON.stringify(ui,null,2)+'\n');
