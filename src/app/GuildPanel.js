import { TRIAL_FINAL_STAGE_NUMBER } from '../game/RunController.js';
import { GAME_AREAS } from '../game/GameAreas.js';
import { HERO_SLOT_SIZE } from '../game/HeroSlotLayout.js';
import { getFacilitySlotOrigin } from '../game/FacilityLayout.js';
import {
  GUILD_EXTENSION_MAX_HOURS,
  getGuildTimeStatus,
} from '../game/GuildTime.js';

const PANEL_VERTICAL_MARGIN = 16;
const PANEL_RIGHT_MARGIN = 24;
const PANEL_GAP_FROM_SLOT = 24;
const PANEL_FILL = '#29273a';
const PANEL_BORDER = '#71509d';
const STAGE_BAND_FILL = '#49355f';
const STAGE_BAND_TEXT = '#f5d99b';
const PANEL_TEXT = '#f3ecdc';
const MUTED_TEXT = '#c5bed1';
const TIMELINE_TRACK = '#1b1a27';
const REMAINING_COLOR = '#a486d1';
const EXTENSION_COLOR = '#f0c879';
const STAGE_PROGRESS_FILL = '#71509d';
const STAGE_PROGRESS_STRIPE = '#8965b4';

function getPanelBounds() {
  const area = GAME_AREAS.guild;
  const slotRight = getFacilitySlotOrigin('guild').x + HERO_SLOT_SIZE;
  return Object.freeze({
    x: slotRight + PANEL_GAP_FROM_SLOT,
    y: area.y + PANEL_VERTICAL_MARGIN,
    width: area.x + area.width - PANEL_RIGHT_MARGIN - (slotRight + PANEL_GAP_FROM_SLOT),
    height: area.height - PANEL_VERTICAL_MARGIN * 2,
  });
}

function drawTimeline(context, { x, y, width, height }, status) {
  const widths = [status.remainingHours, status.estimatedExtensionHours]
    .map((hours) => width * hours / status.timelineHours);
  const radius = height / 2;
  context.fillStyle = TIMELINE_TRACK;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.clip();
  let segmentX = x;
  [[widths[0], REMAINING_COLOR], [widths[1], EXTENSION_COLOR]].forEach(([segmentWidth, color]) => {
    if (segmentWidth <= 0) return;
    context.fillStyle = color;
    context.fillRect(segmentX, y, segmentWidth, height);
    segmentX += segmentWidth;
  });
  context.restore();
  context.strokeStyle = '#161522';
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.stroke();
}

function drawValue(context, text, { x, y, width, size, color = PANEL_TEXT, align = 'start', boldUnits = false, unitColor = MUTED_TEXT }) {
  context.save();
  context.textBaseline = 'alphabetic';
  const parts = text.split(/(\d+)/).filter(Boolean).map((value) => ({
    value,
    size: /^\d+$/.test(value) ? size : 13,
    numeric: /^\d+$/.test(value),
  }));
  const font = (part, scale) => `${part.numeric || boldUnits ? 'bold ' : ''}${part.size * scale}px system-ui`;
  const totalWidth = parts.reduce((sum, part) => {
    context.font = font(part, 1);
    return sum + context.measureText(part.value).width;
  }, 0);
  const scale = Math.min(1, width / totalWidth);
  let partX = x + (align === 'center' ? (width - totalWidth * scale) / 2 : 0);
  context.textAlign = 'start';
  parts.forEach((part) => {
    context.font = font(part, scale);
    context.fillStyle = part.numeric ? color : unitColor;
    context.fillText(part.value, partX, y + size * scale * 0.35);
    partX += context.measureText(part.value).width;
  });
  context.restore();
}

function drawStageProgress(context, { x, y, width, height }, stageNumber, animationTime) {
  const progressWidth = width * Math.min(1, Math.max(0, stageNumber / TRIAL_FINAL_STAGE_NUMBER));
  context.save();
  context.beginPath();
  context.roundRect(x, y, width, height, 6);
  context.clip();
  context.fillStyle = STAGE_BAND_FILL;
  context.fillRect(x, y, width, height);
  context.beginPath();
  context.rect(x, y, progressWidth, height);
  context.clip();
  context.fillStyle = STAGE_PROGRESS_FILL;
  context.fillRect(x, y, progressWidth, height);
  const stripeSpacing = 32;
  const offset = (animationTime * 20) % stripeSpacing;
  context.fillStyle = STAGE_PROGRESS_STRIPE;
  for (let stripeX = x - height - stripeSpacing + offset; stripeX < x + progressWidth; stripeX += stripeSpacing) {
    context.beginPath();
    context.moveTo(stripeX, y + height);
    context.lineTo(stripeX + height, y);
    context.lineTo(stripeX + height + 10, y);
    context.lineTo(stripeX + 10, y + height);
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawMetric(context, texts, key, value, bounds) {
  context.textAlign = 'start';
  context.font = '13px system-ui';
  context.fillStyle = bounds.color ?? MUTED_TEXT;
  context.fillText(texts.getLabel(key), bounds.x, bounds.y);
  drawValue(context, value, { ...bounds, y: bounds.y + 32 });
}

function drawTimelineLegend(context, { x, y, width }, texts) {
  const swatchSize = 10;
  context.font = '13px system-ui';
  context.textAlign = 'start';
  context.fillStyle = REMAINING_COLOR;
  context.fillRect(x, y - swatchSize / 2, swatchSize, swatchSize);
  context.fillStyle = MUTED_TEXT;
  context.fillText(texts.getLabel('remaining'), x + swatchSize + 5, y);

  const label = texts.getLabel('contributionExtension');
  const labelWidth = context.measureText(label).width;
  const labelX = x + width - labelWidth;
  context.fillStyle = EXTENSION_COLOR;
  context.fillRect(labelX - swatchSize - 5, y - swatchSize / 2, swatchSize, swatchSize);
  context.fillStyle = MUTED_TEXT;
  context.fillText(label, labelX, y);
}

export function drawGuildPanel(context, { stageNumber, animationTime = 0, tick, contributionPoints, extensionHours, extensionRate, timelineHours, textRepository: texts }) {
  const time = (hours) => texts.getLabel('daysHours', { days: Math.floor(hours / 24), hours: hours % 24 });
  const panel = getPanelBounds();
  const status = getGuildTimeStatus({ tick, contributionPoints, extensionHours, extensionRate, timelineHours });
  const contentX = panel.x + 16;
  const contentWidth = panel.width - 32;
  context.save();
  context.fillStyle = PANEL_FILL;
  context.strokeStyle = PANEL_BORDER;
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(panel.x, panel.y, panel.width, panel.height, 8);
  context.fill();
  context.stroke();
  context.textAlign = 'start';
  context.textBaseline = 'middle';
  const columnGap = 16;
  const leftWidth = (contentWidth - columnGap) * 0.56;
  const rightX = contentX + leftWidth + columnGap;
  const rightWidth = contentWidth - leftWidth - columnGap;
  drawMetric(context, texts, 'remaining', time(Math.max(0, Math.ceil(status.remainingHours))), {
    x: contentX, y: panel.y + 24, width: leftWidth, size: 42, boldUnits: true,
  });
  drawMetric(context, texts, 'elapsed', time(Math.max(0, Math.floor(status.elapsedHours))), {
    x: rightX, y: panel.y + 24, width: rightWidth, size: 28, boldUnits: true,
  });
  drawTimeline(context, { x: contentX, y: panel.y + 86, width: contentWidth, height: 20 }, status);
  drawTimelineLegend(context, { x: contentX, y: panel.y + 120, width: contentWidth }, texts);
  context.strokeStyle = PANEL_BORDER;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(contentX, panel.y + 140);
  context.lineTo(contentX + contentWidth, panel.y + 140);
  context.stroke();
  const extensionLabel = status.estimatedExtensionHours >= GUILD_EXTENSION_MAX_HOURS
    ? texts.getLabel('maxHours')
    : texts.getLabel('hours', { hours: Math.max(0, Math.floor(status.estimatedExtensionHours)) });
  drawMetric(context, texts, 'extension', extensionLabel, {
    x: rightX, y: panel.y + 162, width: rightWidth, size: 32, color: EXTENSION_COLOR, unitColor: EXTENSION_COLOR,
  });
  drawMetric(context, texts, 'contribution', `${Math.floor(contributionPoints)} pt`, {
    x: contentX, y: panel.y + 162, width: leftWidth, size: 30,
  });
  drawStageProgress(context, { x: contentX, y: panel.y + 228, width: contentWidth, height: 44 }, stageNumber, animationTime);
  drawValue(context, texts.getLabel('stageNumber', { number: stageNumber }), {
    x: contentX, y: panel.y + 250, width: contentWidth, size: 36,
    color: STAGE_BAND_TEXT, align: 'center',
  });
  context.restore();
  return status;
}
