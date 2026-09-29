const TITLE_ACTION_GAP = 8;

export function rectanglesIntersect(first, second) {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top;
}

export function titleActionClearance(textRect, actionRect, nameWidth, scale = 1) {
  const safeScale = scale > 0 ? scale : 1;
  if (!rectanglesIntersect(textRect, actionRect)) {
    return textRect.width <= nameWidth
      ? { whiteSpace: 'nowrap', maxWidth: '' }
      : { whiteSpace: 'normal', maxWidth: '' };
  }
  const maxWidth = Math.max(0, (actionRect.left - textRect.left) / safeScale - TITLE_ACTION_GAP);
  return { whiteSpace: 'normal', maxWidth: `${maxWidth}px` };
}

function elementScale(element) {
  const width = element.offsetWidth;
  if (!width) return 1;
  return element.getBoundingClientRect().width / width;
}

export function fitInformationWindowTitle(title, windowElement) {
  const name = title.querySelector('.InformationWindow__Name');
  const actions = title.querySelector('.InformationWindow__TitleActions');
  if (!name || !actions || typeof document.createRange !== 'function') return;
  name.style.whiteSpace = 'nowrap';
  name.style.maxWidth = '';
  const range = document.createRange();
  range.selectNodeContents(name);
  const fit = titleActionClearance(
    range.getBoundingClientRect(),
    actions.getBoundingClientRect(),
    name.getBoundingClientRect().width,
    elementScale(windowElement),
  );
  name.style.whiteSpace = fit.whiteSpace;
  name.style.maxWidth = fit.maxWidth;
}
