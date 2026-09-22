import { getTagBaseColors, getTagGlyphScales } from '../game/TagCatalog.js';
import { getTagBadgeVisual, getTagSkillVisual } from '../game/TagSkillVisualCatalog.js';
import { STATUS_VISUALS } from '../game/StatusVisualCatalog.js';
import { getLocationVisual } from '../game/LocationVisualCatalog.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { ITEM_VALUE_VISUAL } from '../game/ItemValueVisual.js';
import { createInformationElement } from './InformationWindowElementFactory.js';

export function applyTagSkillVisual(element, count, tag = null) {
  const visual = tag ? getTagBadgeVisual(tag, count) : getTagSkillVisual(count);
  element.style.setProperty('--tag-skill-fill', visual.fill);
  element.style.setProperty('--tag-skill-border', visual.border);
  element.style.setProperty('--tag-skill-text', visual.text);
  element.dataset.tagSkillLevel = String(visual.level);
}

export function createTagIcon(tag, sizeClass = '') {
  const icon = createInformationElement('span', `InformationWindow__TagIcon ${sizeClass}`.trim());
  icon.style.setProperty('--tag-base-color', getTagBaseColors([tag])[0]);
  icon.style.setProperty('--tag-glyph-scale', String(getTagGlyphScales([tag])[0]));
  const image = document.createElement('img');
  image.src = resolvePublicAssetPath(`/assets/tags/${tag}.png`);
  image.alt = '';
  icon.append(image);
  return icon;
}

export function createStatusIcon(status, sizeClass = '') {
  const icon = createInformationElement('span', `InformationWindow__StatusIcon ${sizeClass}`.trim());
  const image = document.createElement('img');
  image.src = resolvePublicAssetPath(STATUS_VISUALS[status].iconPath);
  image.alt = '';
  icon.append(image);
  return icon;
}

export function createLocationIcon(location, sizeClass = '') {
  const icon = createInformationElement('span', `InformationWindow__LocationIcon ${sizeClass}`.trim());
  const image = document.createElement('img');
  image.src = resolvePublicAssetPath(getLocationVisual(location).iconPath);
  image.alt = '';
  icon.append(image);
  return icon;
}

export function createTermIcon(sizeClass = '') {
  const icon = createInformationElement('span', `InformationWindow__TermIcon ${sizeClass}`.trim());
  icon.setAttribute('aria-hidden', 'true');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M4 5.5c2.8-.9 5.4-.2 8 1.7 2.6-1.9 5.2-2.6 8-1.7v12c-2.8-.9-5.4-.2-8 1.7-2.6-1.9-5.2-2.6-8-1.7zM12 7.2v12');
  svg.append(path);
  icon.append(svg);
  return icon;
}

export function createItemValueIcon(sizeClass = '') {
  const icon = createInformationElement('span', `InformationWindow__ItemValueIcon ${sizeClass}`.trim());
  const image = document.createElement('img');
  image.src = resolvePublicAssetPath(ITEM_VALUE_VISUAL.iconPath);
  image.alt = '';
  icon.append(image);
  return icon;
}

export function createEquipmentImage(path) {
  const image = createInformationElement('span', 'InformationWindow__EquipmentImage');
  const asset = document.createElement('img');
  asset.src = resolvePublicAssetPath(path);
  asset.alt = '';
  image.append(asset);
  return image;
}
