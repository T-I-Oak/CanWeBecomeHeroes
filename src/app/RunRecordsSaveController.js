export function isStorageAccessError(error) {
  return error.name === 'QuotaExceededError' || error.name === 'SecurityError';
}

export default class RunRecordsSaveController {
  constructor(repository, notice) {
    this.repository = repository;
    this.notice = notice;
    notice.onRetry = () => this.attempt(() => repository.save());
  }

  attempt(operation) {
    try {
      operation();
    } catch (error) {
      if (!isStorageAccessError(error)) throw error;
      this.notice.show();
      return false;
    }
    this.notice.hide();
    return true;
  }
}
