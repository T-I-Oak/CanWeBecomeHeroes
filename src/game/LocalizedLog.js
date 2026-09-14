export function entityText(entity, framed = true) {
  return entity.chip.type === 'hero'
    ? { kind: 'hero', heroId: entity.heroId, profession: entity.profession, framed }
    : { kind: 'enemy', id: entity.definition.id, framed };
}

export function logText(log, texts, key, values = {}, options = {}) {
  if (!log) return;
  const event = { key, values };
  if (log.logLocalized) log.logLocalized(event, options);
  else log.log(texts ? texts.formatLog(event) : key, options);
}
