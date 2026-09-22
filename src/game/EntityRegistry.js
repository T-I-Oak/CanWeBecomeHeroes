/**
 * Tracks the logical lifetime of game instances independently of their Chip.
 * Moving an item between the board, equipment, or a shopping bag must not
 * invalidate an information window; destroying the instance must.
 */
export default class EntityRegistry {
  constructor() {
    this.liveEntities = new Set();
    this.instanceIds = new WeakMap();
    this.entitiesByInstanceId = new Map();
    this.nextInstanceId = 1;
  }

  register(entity) {
    if (!entity) return entity;
    const instanceId = this.instanceIds.get(entity) ?? `entity-${this.nextInstanceId++}`;
    this.instanceIds.set(entity, instanceId);
    this.entitiesByInstanceId.set(instanceId, entity);
    this.liveEntities.add(entity);
    return entity;
  }

  registerTree(entity) {
    this.register(entity);
    this.#relatedItems(entity).forEach((item) => this.registerTree(item));
    return entity;
  }

  destroy(entity, { includeRelated = false } = {}) {
    if (!entity) return false;
    const removed = this.liveEntities.delete(entity);
    const instanceId = this.instanceIds.get(entity);
    if (instanceId) this.entitiesByInstanceId.delete(instanceId);
    if (includeRelated) this.#relatedItems(entity).forEach((item) => this.destroy(item, { includeRelated: true }));
    return removed;
  }

  isAlive(entity) {
    return this.liveEntities.has(entity);
  }

  getInstanceId(entity) {
    return this.instanceIds.get(entity) ?? null;
  }

  getByInstanceId(instanceId) {
    return this.entitiesByInstanceId.get(instanceId) ?? null;
  }

  #relatedItems(entity) {
    if (!entity) return [];
    if (Array.isArray(entity.storedItems)) return entity.storedItems.filter(Boolean);
    if (Array.isArray(entity.equipment)) return entity.equipment.filter(Boolean);
    if (entity.equipment && typeof entity.equipment === 'object') return Object.values(entity.equipment).filter(Boolean);
    return [];
  }
}
