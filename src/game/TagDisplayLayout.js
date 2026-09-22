import { ATTRIBUTE_TAGS, STATUS_KEYS, STATUS_TAGS } from './TagCatalog.js';

// The status tags are presented by their status column, followed by attributes.
// Information windows and preparation panels share this player-facing order.
export const TAG_DISPLAY_GRID = Object.freeze([
  Object.freeze(STATUS_KEYS.map((status) => STATUS_TAGS[status][0])),
  Object.freeze(STATUS_KEYS.map((status) => STATUS_TAGS[status][1])),
  Object.freeze([...ATTRIBUTE_TAGS]),
]);
