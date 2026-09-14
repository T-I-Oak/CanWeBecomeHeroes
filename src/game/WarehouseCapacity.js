import { CHIP_RADIUS } from '../chips/Chip.js';
import { GAME_AREAS } from './GameAreas.js';

const HEXAGONAL_ROW_GAP_RATIO = Math.sqrt(3) / 2;

function countInLine(length, spacing, diameter) {
  return length < diameter ? 0 : Math.floor((length - diameter) / spacing) + 1;
}

function countAlternatingLines({ crossLength, lineLength, compactGap, diameter, offset }) {
  const lineCount = countInLine(crossLength, compactGap, diameter);
  const alignedCount = countInLine(lineLength, diameter, diameter);
  const offsetCount = countInLine(lineLength - offset, diameter, diameter);
  return Math.ceil(lineCount / 2) * alignedCount + Math.floor(lineCount / 2) * offsetCount;
}

/**
 * Returns the largest capacity of either axis-aligned hexagonal-circle layout.
 * The two candidates alternate every row or every column by half a chip diameter.
 */
export function getHexagonalGridCapacity({ width, height, diameter }) {
  if (!(width > 0) || !(height > 0) || !(diameter > 0)) return 0;
  const halfDiameter = diameter / 2;
  const compactGap = diameter * HEXAGONAL_ROW_GAP_RATIO;
  const rowsShiftedHorizontally = countAlternatingLines({
    crossLength: height,
    lineLength: width,
    compactGap,
    diameter,
    offset: halfDiameter,
  });
  const columnsShiftedVertically = countAlternatingLines({
    crossLength: width,
    lineLength: height,
    compactGap,
    diameter,
    offset: halfDiameter,
  });
  return Math.max(rowsShiftedHorizontally, columnsShiftedVertically);
}

export function getWarehouseItemCapacity(area = GAME_AREAS.warehouse, itemRadius = CHIP_RADIUS.item) {
  return getHexagonalGridCapacity({ width: area.width, height: area.height, diameter: itemRadius * 2 });
}
