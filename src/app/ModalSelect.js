function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

/** Renders application-controlled options so the selected option has a stable visual meaning. */
export default class ModalSelect {
  constructor(select) {
    if (!select) throw new Error('Modal select requires a native select element.');
    this.select = select;
    this.container = select.parentElement;
    this.createPresentation();
    this.bindEvents();
    this.refresh();
  }

  createPresentation() {
    this.select.classList.add('ModalSelect__Native');
    this.select.hidden = true;
    this.trigger = createElement('button', 'ModalSelect__Trigger');
    this.trigger.type = 'button';
    this.trigger.setAttribute('aria-haspopup', 'listbox');
    this.trigger.setAttribute('aria-expanded', 'false');
    if (this.select.hasAttribute('aria-labelledby')) this.trigger.setAttribute('aria-labelledby', this.select.getAttribute('aria-labelledby'));
    this.valueLabel = createElement('span', 'ModalSelect__Value');
    const indicator = createElement('span', 'ModalSelect__Indicator', '▾');
    indicator.setAttribute('aria-hidden', 'true');
    this.trigger.append(this.valueLabel, indicator);
    this.options = createElement('div', 'ModalSelect__Options');
    this.options.setAttribute('role', 'listbox');
    this.options.hidden = true;
    this.container.append(this.trigger, this.options);
  }

  bindEvents() {
    this.trigger.addEventListener('click', () => this.setOpen(this.options.hidden));
    this.select.addEventListener('change', () => this.refresh());
    document.addEventListener('pointerdown', (event) => {
      if (!this.container.contains(event.target)) this.setOpen(false);
    });
    this.trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.setOpen(false);
    });
  }

  refresh() {
    const selectedOption = this.select.selectedOptions[0];
    this.valueLabel.textContent = selectedOption.textContent;
    this.renderOptions();
  }

  setOpen(isOpen) {
    this.options.hidden = !isOpen;
    this.trigger.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) this.renderOptions();
  }

  renderOptions() {
    const optionButtons = [...this.select.options].map((option) => {
      const button = createElement('button', 'ModalSelect__Option', option.textContent);
      button.type = 'button';
      button.setAttribute('role', 'option');
      const isSelected = option.value === this.select.value;
      button.setAttribute('aria-selected', String(isSelected));
      if (isSelected) button.classList.add('state-selected');
      button.addEventListener('click', () => this.selectOption(option.value));
      return button;
    });
    this.options.replaceChildren(...optionButtons);
  }

  selectOption(value) {
    this.select.value = value;
    this.select.dispatchEvent(new Event('change', { bubbles: true }));
    this.setOpen(false);
    this.trigger.focus();
  }
}
