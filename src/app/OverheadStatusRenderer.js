import { getStatusVisual } from '../game/StatusVisualCatalog.js';
import { getOverheadStatusValue, getRotatingOverheadStatus, isOverheadStatusVisible } from '../game/OverheadStatusSettings.js';

const OVERHEAD_STATUS_FONT_SIZE = 32;
const OVERHEAD_STATUS_VERTICAL_GAP = 14;
const OVERHEAD_STATUS_OUTLINE_WIDTH = 6;

export function drawOverheadStatuses(context, entities, settings, textRepository, elapsedSeconds) {
  const status = getRotatingOverheadStatus(settings.statuses, elapsedSeconds);
  if (!status) return;
  entities.forEach((entity) => {
    if (!isOverheadStatusVisible(entity, settings.visibility)) return;
    drawOverheadStatus(context, entity, status, textRepository);
  });
}

export function drawOverheadStatus(context, entity, status, textRepository) {
  const chip = entity.chip;
  const x = chip.x + (chip.effectOffsetX ?? 0);
  const y = chip.y - chip.height + (chip.effectOffsetY ?? 0) - chip.radius - OVERHEAD_STATUS_VERTICAL_GAP;
  const label = `${textRepository.getName('status', status)} ${getOverheadStatusValue(entity, status)}`;
  const visual = getStatusVisual(status);
  context.save();
  context.font = `700 ${OVERHEAD_STATUS_FONT_SIZE}px system-ui`;
  context.textAlign = 'center';
  context.textBaseline = 'bottom';
  context.lineJoin = 'round';
  context.lineWidth = OVERHEAD_STATUS_OUTLINE_WIDTH;
  context.strokeStyle = '#182333';
  context.strokeText(label, x, y);
  context.fillStyle = visual.textColor;
  context.fillText(label, x, y);
  context.restore();
}
