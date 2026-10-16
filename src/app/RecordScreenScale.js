import { getReadablePanelScale } from './ReadablePanelScale.js';
export const RECORD_SCREEN_WIDTH = 1080;

// The viewport retains physical dimensions;
// the content uses logical dimensions before this transform.
export function getRecordScreenLayout(width) {
  const scale = getReadablePanelScale(width / RECORD_SCREEN_WIDTH);
  return { scale, width: Math.max(RECORD_SCREEN_WIDTH, width / scale) };
}
