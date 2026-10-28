import data from '../../public/data/epithet.json' with { type: 'json' };
import enemyTexts from '../../public/data/text/information/enemy.json' with { type: 'json' };
import { aggregate, generate } from './EpithetExpansion.js';
import { getEpithetTagSkillWords } from './EpithetTagSkill.js';
import { TAGS } from './TagCatalog.js';

const facilityFields = ['battle', 'shop', 'guild', 'training', 'shopTags', 'guildHours', 'trainingLuck'];
function valueFor(hero, target) {
  if (target.group === 'tag') return (TAGS[target.id].group === 'status' ? hero.effectiveTags : hero.tags)?.[target.id] ?? 0;
  if (target.group === 'weapon') return hero.weapons?.[target.id] ?? 0;
  if (target.group === 'enemy') return hero.defeats?.[target.id]?.count ?? 0;
  const field = facilityFields[Number(target.id.split('-')[1])];
  return Number(target.id.split('-')[1]) < 4 ? hero.facilities?.[field] ?? 0 : hero[field] ?? 0;
}

export function selectEpithetTargets(statistics, memberIds, heroId, { random = Math.random } = {}) {
  const heroes = statistics?.heroes ?? {};
  const selected = [];
  for (const group of ['tag', 'weapon', 'facility', 'enemy']) {
    const targets = group === 'enemy' ? data.enemies.map(enemy => ({ ...enemy, group })) : data.targets.filter(target => target.group === group);
    let best = -1;
    let tied = [];
    for (const target of targets) {
      const total = memberIds.reduce((sum, id) => sum + valueFor(heroes[id] ?? {}, target), 0);
      const own = valueFor(heroes[heroId] ?? {}, target);
      if (total <= 0 || own <= 0) continue;
      const share = own / total;
      if (share > best + 1e-12) { best = share; tied = [target]; }
      else if (Math.abs(share - best) < 1e-12) tied.push(target);
    }
    if (tied.length) selected.push({ ...tied[Math.min(tied.length - 1, Math.floor(random() * tied.length))], share: best });
  }
  return selected;
}

export function createHeroEpithets(statistics, members, { random = Math.random, language = 'ja' } = {}) {
  const ids = [...new Set(members.map(member => member.heroId))];
  return Object.fromEntries(ids.map(heroId => {
    const targets = selectEpithetTargets(statistics, ids, heroId, { random });
    const english = language === 'en';
    const definitions = [{ source: 'generic', words: english ? data.genericEn : data.generic }];
    for (const target of targets) {
      if (target.group === 'enemy') {
        definitions.push({ source: target.id, words: {
          person_base: { enemy: [enemyTexts[target.id].name['lang-store'][language]] },
          person: { ally: english ? ['[actionPerson(enemy)]'] : ['[person_base(enemy)][actionPerson(enemy)]'] },
        } });
      } else {
        definitions.push({ source: target.id, words: english ? target.wordsEn : target.words });
        if (target.group === 'tag') {
          const skillWords = getEpithetTagSkillWords(target.id, valueFor(statistics.heroes[heroId], target), language);
          if (skillWords) definitions.push({ source: `${target.id}:skill`, words: skillWords });
        }
      }
    }
    return [heroId, generate(data.template, aggregate(definitions), english ? data.defaultsEn : data.defaults, { random, maxDepth: 12 }).text];
  }));
}
