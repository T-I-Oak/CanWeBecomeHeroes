import { setupLanguageSelector } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import { resolvePublicAssetPath } from '../chips/PublicAssetPath.js';
import { APP_COPYRIGHT, APP_VERSION } from '../game/AppMetadata.js';
import ModalLayer from './ModalLayer.js';
import ModalSelect from './ModalSelect.js';
import TitleChipRain from './TitleChipRain.js';

function createElement(tagName, className, text = null) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== null) element.textContent = text;
  return element;
}

/** Top menu shown before a trial and after the player leaves a result. */
export default class TitleMenu {
  constructor(container, { textRepository, assets, heroProgress } = {}) {
    if (!container || !textRepository || !assets || !heroProgress) {
      throw new Error('Title menu requires a container, text repository, assets, and hero progress.');
    }
    this.modalLayer = new ModalLayer(container);
    this.container = this.modalLayer.container;
    this.textRepository = textRepository;
    this.assets = assets;
    this.heroProgress = heroProgress;
    this.rain = null;
    this.commands = [];
  }

  show() {
    this.render();
    this.modalLayer.open();
    this.rain.start();
    return new Promise((resolve) => { this.resolve = resolve; });
  }

  refreshLanguage() {
    this.commands.forEach((command) => {
      command.element.textContent = this.textRepository.getLabel(command.label);
    });
    if (this.recordsMessage) this.recordsMessage.textContent = this.textRepository.getLabel('recordsEmpty');
    if (this.languageCaption) this.languageCaption.textContent = this.textRepository.getLabel('language');
    this.backButtons?.forEach((button) => { button.textContent = this.textRepository.getLabel('close'); });
    this.languageSelect?.refresh();
  }

  render() {
    const stage = createElement('div', 'TitleMenu__Stage');
    const canvas = createElement('canvas', 'TitleMenu__Chips');
    const shade = createElement('div', 'TitleMenu__Shade');
    const content = createElement('div', 'TitleMenu__Content');
    this.container.style.backgroundImage = `url("${resolvePublicAssetPath('/assets/background/warehouse.png')}")`;
    const logo = createElement('img', 'TitleMenu__Logo');
    logo.src = resolvePublicAssetPath('/assets/logo.png');
    logo.alt = 'Can We Become Heroes?';
    this.menu = createElement('nav', 'TitleMenu__Menu');
    this.panel = createElement('div', 'TitleMenu__Panel');
    content.append(logo, this.menu, this.panel);
    stage.append(canvas, shade, content, this.createCredit());
    this.container.replaceChildren(stage);
    this.rain = new TitleChipRain(canvas, this.assets);
    this.renderMenu();
    this.renderPanel();
  }

  createCredit() {
    const credit = createElement('p', 'TitleMenu__Credit');
    const version = createElement('span', 'TitleMenu__Version', `v${APP_VERSION}`);
    const notice = createElement('span', 'TitleMenu__Copyright', `© ${APP_COPYRIGHT.holder} ${APP_COPYRIGHT.year} | `);
    const portal = createElement('a', 'TitleMenu__Portal', APP_COPYRIGHT.portal);
    portal.href = APP_COPYRIGHT.portalUrl;
    portal.target = '_blank';
    portal.rel = 'noopener noreferrer';
    notice.append(portal);
    credit.append(version, notice);
    return credit;
  }

  renderMenu() {
    const commands = [
      ['startGame', () => this.choose('trial')],
      ['records', () => this.openPanel('records')],
      ['settings', () => this.openPanel('settings')],
    ];
    if (this.heroProgress.hasClearedTrial()) commands.splice(1, 0, ['challengeMode', () => this.choose('challenge')]);
    this.commands = commands.map(([label, onClick]) => {
      const element = createElement('button', label === 'startGame' ? 'TitleMenu__Command state-primary' : 'TitleMenu__Command', this.textRepository.getLabel(label));
      element.type = 'button';
      element.addEventListener('click', onClick);
      return { label, element };
    });
    this.menu.replaceChildren(...this.commands.map((command) => command.element));
  }

  renderPanel() {
    this.recordsMessage = createElement('p', 'TitleMenu__Message', this.textRepository.getLabel('recordsEmpty'));
    this.languageLabel = createElement('label', 'TitleMenu__LanguageLabel');
    this.languageLabel.htmlFor = 'title-language-selector';
    this.languageCaption = createElement('span', 'TitleMenu__LanguageCaption', this.textRepository.getLabel('language'));
    const select = createElement('select', 'TitleMenu__LanguageSelect');
    select.id = 'title-language-selector';
    this.languageLabel.append(this.languageCaption, select);
    setupLanguageSelector(select, ['ja', 'en']);
    this.languageSelect = new ModalSelect(select);
    this.backButtons = ['records', 'settings'].map(() => {
      const button = createElement('button', 'TitleMenu__Command', this.textRepository.getLabel('close'));
      button.type = 'button';
      button.addEventListener('click', () => this.closePanel());
      return button;
    });
    this.recordsView = createElement('div', 'TitleMenu__PanelBody');
    this.recordsView.append(this.recordsMessage, this.backButtons[0]);
    this.settingsView = createElement('div', 'TitleMenu__PanelBody');
    this.settingsView.append(this.languageLabel, this.backButtons[1]);
    this.panel.append(this.recordsView, this.settingsView);
  }

  openPanel(name) {
    this.menu.classList.add('state-hidden');
    this.panel.classList.add('state-open');
    this.recordsView.classList.toggle('state-open', name === 'records');
    this.settingsView.classList.toggle('state-open', name === 'settings');
  }

  closePanel() {
    this.panel.classList.remove('state-open');
    this.recordsView.classList.remove('state-open');
    this.settingsView.classList.remove('state-open');
    this.menu.classList.remove('state-hidden');
  }

  choose(action) {
    this.rain.stop();
    this.modalLayer.close();
    this.resolve(action);
  }
}
