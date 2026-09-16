import { GAME_AREAS } from '../game/GameAreas.js';
import { getFacilitySlotOrigin } from '../game/FacilityLayout.js';
import { HERO_SLOT_SIZE } from '../game/HeroSlotLayout.js';
import { PREPARATION_LAYOUT } from '../game/PreparationLayout.js';
import { STATUS_VISUALS, getVitalGaugeColor } from '../game/StatusVisualCatalog.js';
import { getWeightFillRatio } from '../game/WeightVisual.js';

export const HERO_STATUS_DEFINITIONS = Object.freeze([
  { key: 'power', visual: STATUS_VISUALS.power }, { key: 'magic', visual: STATUS_VISUALS.magic }, { key: 'speed', visual: STATUS_VISUALS.speed },
  { key: 'negotiation', visual: STATUS_VISUALS.negotiation }, { key: 'luck', visual: STATUS_VISUALS.luck }, { key: 'stamina', visual: STATUS_VISUALS.stamina },
]);
export const PREPARATION_HERO_STATUS_DEFINITIONS = Object.freeze([...HERO_STATUS_DEFINITIONS, { key: 'weight', visual: STATUS_VISUALS.weight }]);

export function drawStatusGauge(context, assets, visual, x, y, value, maximum, activeColor = '#54c96b', { highlightedCells = [], highlightPhase = 0 } = {}) {
  const { statusGaugeWidth: width, statusGaugeHeight: height, statusIconSize, statusIconTopPadding, statusGaugeHorizontalPadding: inset, statusGaugeBottomPadding, statusSegmentHeight, statusSegmentGap: gap } = PREPARATION_LAYOUT;
  context.fillStyle = visual.gaugeFrameColor; context.beginPath(); context.roundRect(x, y, width, height, 9); context.fill();
  const icon = assets.load(visual.iconPath); if (icon.complete && icon.naturalWidth > 0) context.drawImage(icon, x + (width - statusIconSize) / 2, y + statusIconTopPadding, statusIconSize, statusIconSize);
  for (let index = 0; index < 7; index += 1) { const segmentY = y + height - statusGaugeBottomPadding - statusSegmentHeight - index * (statusSegmentHeight + gap); const ratio = Math.max(0, Math.min(1, value - index)); context.fillStyle = index < maximum ? '#9da9ba' : '#46536a'; context.beginPath(); context.roundRect(x + inset, segmentY, width - inset * 2, statusSegmentHeight, 4); context.fill(); if (ratio > 0) { context.save(); context.beginPath(); context.rect(x + inset, segmentY, (width - inset * 2) * ratio, statusSegmentHeight); context.clip(); context.fillStyle = activeColor; context.fill(); context.restore(); } if (highlightedCells.includes(index + 1)) { context.save(); context.fillStyle = `rgba(255, 215, 91, ${0.55 + Math.sin(highlightPhase) * 0.25})`; context.fill(); context.restore(); } }
}

export function drawWeightGauge(context, assets, x, y, weight) {
  const { statusGaugeWidth: width, statusGaugeHeight: height, statusIconSize, statusIconTopPadding } = PREPARATION_LAYOUT; const visual = STATUS_VISUALS.weight; const top = y + 33; const bottom = top + 70;
  context.fillStyle = visual.gaugeFrameColor; context.beginPath(); context.roundRect(x, y, width, height, 9); context.fill(); const icon = assets.load(visual.iconPath); if (icon.complete && icon.naturalWidth > 0) context.drawImage(icon, x + (width - statusIconSize) / 2, y + statusIconTopPadding, statusIconSize, statusIconSize);
  context.save(); context.beginPath(); context.moveTo(x + 4, top); context.lineTo(x + width - 4, top); context.lineTo(x + width - 12, bottom); context.lineTo(x + 12, bottom); context.closePath(); context.clip(); const gradient = context.createLinearGradient(0, bottom, 0, top); gradient.addColorStop(0, '#58c96d'); gradient.addColorStop(.55, '#d6be57'); gradient.addColorStop(1, '#ca7553'); context.fillStyle = gradient; context.fillRect(x, bottom - 70 * getWeightFillRatio(weight), width, 70 * getWeightFillRatio(weight)); context.restore(); context.fillStyle = '#f3f6fa'; context.font = 'bold 14px system-ui'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(String(weight), x + width / 2, y + height - 10); context.textAlign = 'start'; context.textBaseline = 'alphabetic';
}

export function getTrainingStatusGaugeBounds(statusIndex) { const area = GAME_AREAS.training; const origin = getFacilitySlotOrigin('training'); const { statusColumnWidth, statusColumnGap, statusGaugeWidth, statusGaugeHeight } = PREPARATION_LAYOUT; return { x: origin.x + HERO_SLOT_SIZE + 24 + statusIndex * (statusColumnWidth + statusColumnGap) + (statusColumnWidth - statusGaugeWidth) / 2, y: area.y + (area.height - statusGaugeHeight) / 2, width: statusGaugeWidth, height: statusGaugeHeight }; }
export function drawTrainingStatusPanel(context, assets, hero, presentation, time) { const highlights = new Map(); presentation?.gainedCells.forEach(({ stat, value }) => highlights.set(stat, [...(highlights.get(stat) ?? []), value])); HERO_STATUS_DEFINITIONS.forEach(({ key, visual }, index) => { const bounds = getTrainingStatusGaugeBounds(index); drawStatusGauge(context, assets, visual, bounds.x, bounds.y, hero ? (key === 'stamina' ? hero.stamina : Math.floor(hero.getStatus(key))) : 0, hero?.maximums[key] ?? 0, key === 'stamina' ? getVitalGaugeColor(hero?.stamina ?? 0) : '#54c96b', { highlightedCells: highlights.get(key) ?? [], highlightPhase: time / 180 }); }); }
