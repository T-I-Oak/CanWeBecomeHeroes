import { TAGS } from './TagCatalog.js';

export const TAG_SKILL_THRESHOLDS = Object.freeze([1, 3, 5, 7]);

export const TAG_SKILL_VISUALS = Object.freeze({
  0: Object.freeze({ level: 0, fill: '#dce2eb', border: '#b8c1d0', text: '#526078' }),
  1: Object.freeze({ level: 1, fill: '#26754a', border: '#10452a', text: '#ffffff' }),
  2: Object.freeze({ level: 2, fill: '#285fa8', border: '#153a70', text: '#ffffff' }),
  3: Object.freeze({ level: 3, fill: '#78419f', border: '#472163', text: '#ffffff' }),
  4: Object.freeze({ level: 4, fill: '#a96f16', border: '#69410a', text: '#ffffff' }),
});

export function getTagSkillLevelForCount(count) {
  const capped = Math.max(0, Math.min(7, count));
  return TAG_SKILL_THRESHOLDS.filter((threshold) => capped >= threshold).length;
}

export function getTagSkillVisual(count) {
  return TAG_SKILL_VISUALS[getTagSkillLevelForCount(count)];
}

export function getTagBadgeVisual(tag, count) {
  if (!TAGS[tag]) throw new RangeError(`Unknown tag: ${tag}`);
  // 属性タグはタグスキルを持たないため、未所持と所持の2段階だけを示す。
  return getTagSkillVisual(TAGS[tag].group === 'attribute' && count > 0 ? 1 : count);
}
