/** Keeps opening X on an explicit click, after the image is copied. */
export default class TrialResultShareConfirm {
  show(textRepository, text) {
    const label = id => textRepository.getLabel(id);
    const dialog = document.createElement('dialog');
    dialog.className = 'ResultShareConfirm';
    const title = document.createElement('h2');
    title.id = 'result-share-confirm-title';
    title.textContent = label('trialResultShare');
    dialog.setAttribute('aria-labelledby', title.id);
    const message = document.createElement('p');
    message.id = 'result-share-confirm-message';
    message.textContent = label('trialResultCopied');
    dialog.setAttribute('aria-describedby', message.id);
    const actions = document.createElement('div');
    actions.className = 'ResultShareConfirm__Actions';
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = label('trialResultOpenX');
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = label('close');
    actions.append(open, close);
    dialog.append(title, message, actions);
    return new Promise(resolve => {
      this.close = () => { dialog.close(); dialog.remove(); resolve(); };
      open.addEventListener('click', () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        this.close();
      });
      close.addEventListener('click', () => this.close());
      dialog.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
      document.body.append(dialog);
      dialog.showModal();
    });
  }
  close() {}
}
