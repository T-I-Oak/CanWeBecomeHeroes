function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

/**
 * Creates the shared structure for an application modal.
 * Feature modules own only the content and actions placed in each region.
 */
export function createModalDialog({ dialogClass, title, titleId, titleLevel = 'h1' }) {
  const dialog = createElement('section', `ModalDialog ${dialogClass}`);
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', titleId);

  const header = createElement('header', 'ModalDialog__Header');
  const heading = createElement('div', 'ModalDialog__Heading');
  const titleElement = createElement(titleLevel, 'ModalDialog__Title', title);
  titleElement.id = titleId;
  heading.append(titleElement);
  header.append(heading);

  const body = createElement('div', 'ModalDialog__Body');
  const footer = createElement('footer', 'ModalDialog__Footer');
  return { dialog, header, heading, titleElement, body, footer };
}
