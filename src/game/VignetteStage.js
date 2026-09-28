export const VIGNETTE_STAGE_WIDTH = 560;
export const VIGNETTE_STAGE_HEIGHT = 400;
export const VIGNETTE_DIALOGUE_WIDTH = 512;
export const VIGNETTE_DIALOGUE_FONT_SIZE = 28;
export const VIGNETTE_DIALOGUE_LINE_HEIGHT = 40;
export const VIGNETTE_DIALOGUE_PADDING = 16;
export const VIGNETTE_DIALOGUE_SIDE_PADDING = 8;
export const VIGNETTE_FRAME_PADDING = 16;
export const VIGNETTE_BUBBLE_TAIL = 14;
export const VIGNETTE_BUBBLE_TAIL_BASE = 22;
export const VIGNETTE_BUBBLE_RADIUS = 12;
export const VIGNETTE_BUBBLE_BORDER = 2;
export const VIGNETTE_START_FOOT_Y = 248;
export const VIGNETTE_CHIP_RADIUS = 56;
export const VIGNETTE_BACKGROUND_WIDTH = 1120;
export const VIGNETTE_BACKGROUND_HEIGHT = 400;

export function vignetteStageScale(availableWidth, availableHeight) {
  if (!(availableWidth > 0) || !(availableHeight > 0)) return 0;
  return Math.min(availableWidth / VIGNETTE_STAGE_WIDTH, availableHeight / VIGNETTE_STAGE_HEIGHT);
}

const NO_LINE_START = '、。，．,！？?!‼⁇⁈⁉…‥・：；:;ゝゞヽヾー―—ｰ〜～々〻゛゜）〕］｝〉》」』】〗〙〟)]}’”ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ';
const NO_LINE_END = '（〔［｛〈《「『【〖〘〝([{‘“';

export function wrapVignetteDialogue(text, measure, maxWidth = VIGNETTE_DIALOGUE_WIDTH, maxLines = Infinity) {
  const characters = [...(text ?? '')];
  const lines = [];
  let line = '';
  let index = 0;
  while (index < characters.length && lines.length < maxLines) {
    const character = characters[index];
    const next = line + character;
    if (line && measure(next) > maxWidth) {
      const split = splitWrappedLine(line, character);
      lines.push(split.head);
      line = split.carry;
      if (split.consumed) index += 1;
      continue;
    }
    line = next;
    index += 1;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function violatesKinsoku(line, character, breakAt) {
  const nextStarts = (line.slice(breakAt) + character)[0];
  if (nextStarts && NO_LINE_START.includes(nextStarts)) return true;
  return breakAt > 0 && NO_LINE_END.includes(line[breakAt - 1]);
}

function splitWrappedLine(line, character) {
  let breakAt = line.length;
  const space = line.lastIndexOf(' ');
  if (space !== -1) breakAt = space + 1;
  while (breakAt > 0 && violatesKinsoku(line, character, breakAt)) breakAt -= 1;
  if (breakAt === 0) return { head: line, carry: character, consumed: true };
  if (character === ' ' && breakAt === line.length) return { head: line + character, carry: '', consumed: true };
  return { head: line.slice(0, breakAt), carry: line.slice(breakAt), consumed: false };
}

function bubbleBodyWidth(width, direction, stageWidth) {
  const horizontal = direction === 'left' || direction === 'right';
  const safe = stageWidth - VIGNETTE_FRAME_PADDING * 2;
  return Math.min(Math.max(width, 0), safe - (horizontal ? VIGNETTE_BUBBLE_TAIL : 0));
}

export function vignetteBubbleTextWidth(width, direction = 'down', stageWidth = VIGNETTE_STAGE_WIDTH) {
  return Math.max(0, bubbleBodyWidth(width, direction, stageWidth) - VIGNETTE_DIALOGUE_SIDE_PADDING * 2);
}

export function vignetteBubbleMaxLines(direction = 'down', stageHeight = VIGNETTE_STAGE_HEIGHT, inkHeight = VIGNETTE_DIALOGUE_FONT_SIZE) {
  const horizontal = direction === 'left' || direction === 'right';
  const safe = stageHeight - VIGNETTE_FRAME_PADDING * 2;
  const maxBody = safe - (horizontal ? 0 : VIGNETTE_BUBBLE_TAIL);
  const extra = maxBody - VIGNETTE_DIALOGUE_PADDING * 2 - inkHeight;
  if (!(extra >= 0)) return 1;
  return 1 + Math.floor(extra / VIGNETTE_DIALOGUE_LINE_HEIGHT);
}

function clamp(value, min, max) {
  if (!(max > min)) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

export function layoutVignetteBubble({
  chipCenterX,
  chipCenterY,
  chipRadius,
  direction = 'down',
  width,
  lines,
  inkHeight = VIGNETTE_DIALOGUE_FONT_SIZE,
  stageWidth = VIGNETTE_STAGE_WIDTH,
  stageHeight = VIGNETTE_STAGE_HEIGHT,
}) {
  const pad = VIGNETTE_FRAME_PADDING;
  const tail = VIGNETTE_BUBBLE_TAIL;
  const safeLeft = pad;
  const safeTop = pad;
  const safeRight = stageWidth - pad;
  const safeBottom = stageHeight - pad;
  const horizontal = direction === 'left' || direction === 'right';
  const bodyWidth = bubbleBodyWidth(width, direction, stageWidth);
  const rowCount = Math.max(lines, 0);
  const textHeight = rowCount === 0 ? 0 : (rowCount - 1) * VIGNETTE_DIALOGUE_LINE_HEIGHT + inkHeight;
  const bodyHeight = Math.min(
    VIGNETTE_DIALOGUE_PADDING * 2 + textHeight,
    safeBottom - safeTop - (horizontal ? 0 : tail),
  );
  let bodyX = chipCenterX - bodyWidth / 2;
  let bodyY = chipCenterY - bodyHeight / 2;
  if (direction === 'down') bodyY = chipCenterY + chipRadius + tail;
  else if (direction === 'up') bodyY = chipCenterY - chipRadius - tail - bodyHeight;
  else if (direction === 'left') bodyX = chipCenterX - chipRadius - tail - bodyWidth;
  else if (direction === 'right') bodyX = chipCenterX + chipRadius + tail;
  const tailGapX = direction === 'left' ? tail : 0;
  const tailGapRight = direction === 'right' ? tail : 0;
  const tailGapY = direction === 'down' ? tail : 0;
  const tailGapBottom = direction === 'up' ? tail : 0;
  bodyX = clamp(bodyX, safeLeft + tailGapRight, safeRight - bodyWidth - tailGapX);
  bodyY = clamp(bodyY, safeTop + tailGapY, safeBottom - bodyHeight - tailGapBottom);
  const inset = VIGNETTE_BUBBLE_RADIUS + VIGNETTE_BUBBLE_TAIL_BASE / 2;
  let tipX = chipCenterX;
  let tipY = chipCenterY;
  let baseX = chipCenterX;
  let baseY = chipCenterY;
  if (direction === 'down' || direction === 'up') {
    baseY = direction === 'down' ? bodyY : bodyY + bodyHeight;
    tipY = baseY + (direction === 'down' ? -tail : tail);
    baseX = clamp(chipCenterX, bodyX + inset, bodyX + bodyWidth - inset);
    tipX = baseX;
  } else {
    baseX = direction === 'right' ? bodyX : bodyX + bodyWidth;
    tipX = baseX + (direction === 'right' ? -tail : tail);
    baseY = clamp(chipCenterY, bodyY + inset, bodyY + bodyHeight - inset);
    tipY = baseY;
  }
  tipX = clamp(tipX, safeLeft, safeRight);
  tipY = clamp(tipY, safeTop, safeBottom);
  return {
    x: bodyX,
    y: bodyY,
    width: bodyWidth,
    height: bodyHeight,
    radius: VIGNETTE_BUBBLE_RADIUS,
    textX: bodyX + VIGNETTE_DIALOGUE_SIDE_PADDING,
    textY: bodyY + VIGNETTE_DIALOGUE_PADDING,
    textWidth: Math.max(0, bodyWidth - VIGNETTE_DIALOGUE_SIDE_PADDING * 2),
    tail: [
      { x: tipX, y: tipY },
      { x: baseX - (direction === 'left' || direction === 'right' ? 0 : VIGNETTE_BUBBLE_TAIL_BASE / 2), y: baseY - (direction === 'down' || direction === 'up' ? 0 : VIGNETTE_BUBBLE_TAIL_BASE / 2) },
      { x: baseX + (direction === 'left' || direction === 'right' ? 0 : VIGNETTE_BUBBLE_TAIL_BASE / 2), y: baseY + (direction === 'down' || direction === 'up' ? 0 : VIGNETTE_BUBBLE_TAIL_BASE / 2) },
    ],
  };
}

export function traceVignetteBubble(context, bubble) {
  const { x, y, width: w, height: h, radius: r, tail: [tip, a, b] } = bubble;
  context.beginPath();
  if (tip.y < y) {
    const left = a.x < b.x ? a : b;
    const right = a.x < b.x ? b : a;
    context.moveTo(right.x, y);
    context.lineTo(x + w - r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + r, y, r);
    context.lineTo(left.x, y);
    context.lineTo(tip.x, tip.y);
    context.closePath();
    return;
  }
  if (tip.y > y + h) {
    const left = a.x < b.x ? a : b;
    const right = a.x < b.x ? b : a;
    context.moveTo(left.x, y + h);
    context.lineTo(x + r, y + h);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.lineTo(right.x, y + h);
    context.lineTo(tip.x, tip.y);
    context.closePath();
    return;
  }
  if (tip.x > x + w) {
    const top = a.y < b.y ? a : b;
    const bottom = a.y < b.y ? b : a;
    context.moveTo(x + w, top.y);
    context.lineTo(x + w, y + r);
    context.arcTo(x + w, y, x, y, r);
    context.arcTo(x, y, x, y + h, r);
    context.arcTo(x, y + h, x + w, y + h, r);
    context.arcTo(x + w, y + h, x + w, y, r);
    context.lineTo(x + w, bottom.y);
    context.lineTo(tip.x, tip.y);
    context.closePath();
    return;
  }
  const top = a.y < b.y ? a : b;
  const bottom = a.y < b.y ? b : a;
  context.moveTo(x, top.y);
  context.lineTo(x, y + r);
  context.arcTo(x, y, x + w, y, r);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.lineTo(x, bottom.y);
  context.lineTo(tip.x, tip.y);
  context.closePath();
}
