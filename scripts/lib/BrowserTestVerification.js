export function descendants(processes, known) {
  const found = new Map(known.map(p => [`${p.pid}:${p.created}`, p]));
  let changed;
  do {
    changed = false;
    for (const process of processes) {
      const key = `${process.pid}:${process.created}`;
      if (found.has(key)) continue;
      const parent = [...found.values()].find(p => p.pid === process.parent && p.created <= process.created);
      const currentParent = processes.find(p => p.pid === process.parent);
      if (parent && (!currentParent || currentParent.created === parent.created)) {
        found.set(key, process);
        changed = true;
      }
    }
  } while (changed);
  return processes.filter(p => found.has(`${p.pid}:${p.created}`));
}

export function verificationPassed(result) {
  return result.exitCode === 0 && !result.timedOut && !result.interrupted &&
    !result.observationError && result.stats?.expected === 4 &&
    result.stats.unexpected === 0 && result.stats.skipped === 0 && result.stats.flaky === 0 &&
    result.errors.length === 0 && result.remaining.length === 0 && result.listeners.length === 0;
}
