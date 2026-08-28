export const TAG_SKILL_THRESHOLDS = Object.freeze([1, 3, 5, 7]);

export const TAG_SKILL_VISUALS = Object.freeze({
  0: Object.freeze({ level: 0, fill: '#dce2eb', border: '#b8c1d0', text: '#526078' }),
  1: Object.freeze({ level: 1, fill: '#e4f7e9', border: '#3d9a59', text: '#1d6634' }),
  2: Object.freeze({ level: 2, fill: '#e6effa', border: '#3e7bb9', text: '#1d4f83' }),
  3: Object.freeze({ level: 3, fill: '#f0e9fa', border: '#8b5ab7', text: '#56317d' }),
  4: Object.freeze({ level: 4, fill: '#fff2cc', border: '#b87b1e', text: '#694008' }),
});

export function getTagSkillLevelForCount(count) {
  const capped = Math.max(0, Math.min(7, count));
  return TAG_SKILL_THRESHOLDS.filter((threshold) => capped >= threshold).length;
}

export function getTagSkillVisual(count) {
  return TAG_SKILL_VISUALS[getTagSkillLevelForCount(count)];
}
