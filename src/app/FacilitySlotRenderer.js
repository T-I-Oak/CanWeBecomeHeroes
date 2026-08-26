import { AREA_THEME } from '../game/AreaTheme.js';
import { HERO_SLOT_SIZE } from '../game/HeroSlotLayout.js';
import { getFacilitySlotOrigin } from '../game/FacilityLayout.js';

const SLOT_INSET = 5;
const SLOT_CORNER_RADIUS = 18;
const SLOT_FILL_ALPHA = '66';

function drawSlot(context, { x, y }, color) {
  context.fillStyle = `${color}${SLOT_FILL_ALPHA}`;
  context.strokeStyle = color;
  context.beginPath();
  context.roundRect(
    x + SLOT_INSET,
    y + SLOT_INSET,
    HERO_SLOT_SIZE - SLOT_INSET * 2,
    HERO_SLOT_SIZE - SLOT_INSET * 2,
    SLOT_CORNER_RADIUS,
  );
  context.fill();
  context.stroke();
}

export function drawFacilitySlots(context) {
  context.save();
  context.lineWidth = 4;
  ['shop', 'guild', 'training'].forEach((areaName) => {
    drawSlot(context, getFacilitySlotOrigin(areaName), AREA_THEME[areaName].border);
  });
  context.restore();
}
