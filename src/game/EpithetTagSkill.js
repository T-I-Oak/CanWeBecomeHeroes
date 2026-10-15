import { TAGS } from './TagCatalog.js';
import { getTagSkillLevelForCount } from './TagSkillVisualCatalog.js';
import tagTexts from '../../public/data/text/information/tag.json' with { type: 'json' };

/** Uses the canonical skill thresholds and localized skill names, without a default. */
export function getEpithetTagSkillWords(tag, maximumCount, language = 'ja') {
  if (TAGS[tag]?.group !== 'status' || maximumCount < 1 || !Number.isFinite(maximumCount)) return null;
  const level = getTagSkillLevelForCount(maximumCount);
  const name = tagTexts[tag].skillNames['lang-store'][language][level - 1];
  return { tagSkill: { common: [language === 'ja' ? `「${name}」` : `“${name}”`] } };
}
