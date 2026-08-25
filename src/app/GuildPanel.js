import { GAME_AREAS } from '../game/GameAreas.js';
import { HERO_SLOT_SIZE } from '../game/HeroSlotLayout.js';
import {
  formatElapsedGuildTime,
  formatGuildHours,
  formatRemainingGuildTime,
  GUILD_EXTENSION_MAX_HOURS,
  getGuildTimeStatus,
} from '../game/GuildTime.js';

const PANEL_MARGIN = 16;
const PANEL_GAP_FROM_SLOT = 16;
const PANEL_FILL = '#29273a';
const PANEL_BORDER = '#71509d';
const PANEL_TEXT = '#f3ecdc';
const MUTED_TEXT = '#c5bed1';
const TIMELINE_TRACK = '#1b1a27';
const REMAINING_COLOR = '#a486d1';
const EXTENSION_COLOR = '#d3a65e';

function getPanelBounds() {
  const area = GAME_AREAS.guild;
  const slotRight = area.x + (area.width / 2 - HERO_SLOT_SIZE) / 2 + HERO_SLOT_SIZE;
  return Object.freeze({
    x: slotRight + PANEL_GAP_FROM_SLOT,
    y: area.y + PANEL_MARGIN,
    width: area.x + area.width - PANEL_MARGIN - (slotRight + PANEL_GAP_FROM_SLOT),
    height: area.height - PANEL_MARGIN * 2,
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

function drawRow(context, label, value, x, y, width, valueColor = PANEL_TEXT) {
  context.font = '13px system-ui';
  context.textAlign = 'start';
  context.fillStyle = MUTED_TEXT;
  context.fillText(label, x, y);
  context.textAlign = 'end';
  context.fillStyle = valueColor;
  context.fillText(value, x + width, y);
}

function drawTimelineLegend(context, { x, y, width }) {
  const swatchSize = 10;
  context.font = '12px system-ui';
  context.textAlign = 'start';
  context.fillStyle = REMAINING_COLOR;
  context.fillRect(x, y - swatchSize / 2, swatchSize, swatchSize);
  context.fillStyle = MUTED_TEXT;
  context.fillText('残り期限', x + swatchSize + 5, y);

  const label = '貢献による延長見込';
  const labelWidth = context.measureText(label).width;
  const labelX = x + width - labelWidth;
  context.fillStyle = EXTENSION_COLOR;
  context.fillRect(labelX - swatchSize - 5, y - swatchSize / 2, swatchSize, swatchSize);
  context.fillStyle = MUTED_TEXT;
  context.fillText(label, labelX, y);
}

export function drawGuildPanel(context, { tick, contributionPoints }) {
  const panel = getPanelBounds();
  const status = getGuildTimeStatus({ tick, contributionPoints });
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
  context.fillStyle = MUTED_TEXT;
  context.font = 'bold 13px system-ui';
  context.fillText('残り期限', contentX, panel.y + 25);
  context.fillStyle = PANEL_TEXT;
  context.font = 'bold 26px system-ui';
  context.fillText(formatRemainingGuildTime(status.remainingHours), contentX, panel.y + 55);
  drawTimeline(context, { x: contentX, y: panel.y + 78, width: contentWidth, height: 16 }, status);
  drawTimelineLegend(context, { x: contentX, y: panel.y + 105, width: contentWidth });
  context.strokeStyle = PANEL_BORDER;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(contentX, panel.y + 122);
  context.lineTo(contentX + contentWidth, panel.y + 122);
  context.stroke();
  drawRow(context, '経過時間', formatElapsedGuildTime(status.elapsedHours), contentX, panel.y + 152, contentWidth);
  drawRow(context, '貢献', `${Math.floor(contributionPoints)} pt`, contentX, panel.y + 182, contentWidth);
  const extensionLabel = status.estimatedExtensionHours >= GUILD_EXTENSION_MAX_HOURS ? '24H（MAX）' : formatGuildHours(status.estimatedExtensionHours);
  drawRow(context, '延長見込', extensionLabel, contentX, panel.y + 212, contentWidth, EXTENSION_COLOR);
  context.restore();
}
