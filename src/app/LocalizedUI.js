export function refreshLocalizedUI(root, texts) {
  if (root.documentElement) root.documentElement.lang = texts.getLabel('documentLanguage');
  root.querySelectorAll('[data-ui]').forEach(element => {
    element.textContent = texts.getLabel(element.dataset.ui);
  });
  root.querySelectorAll('[data-ui-aria]').forEach(element => {
    element.setAttribute('aria-label', texts.getLabel(element.dataset.uiAria));
  });
}
