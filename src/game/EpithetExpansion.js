// Shared expansion rules for trial epithets and the development simulator.
const TOKEN = /\[([^\[\]]+)\]/g;
const SIDES = ['ally', 'enemy', 'common'];

export function aggregate(definitions) {
  const pool = new Map();
  for (const { source, words } of definitions) {
    for (const [keyword, groups] of Object.entries(words)) {
      const entries = pool.get(keyword) ?? [];
      for (const side of SIDES) {
        for (const value of groups[side] ?? []) entries.push({ value, side, source });
      }
      pool.set(keyword, entries);
    }
  }
  return pool;
}

export function generate(template, pool, defaults, { random = Math.random, maxDepth = Infinity } = {}) {
  if (maxDepth !== Infinity && (!Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 12)) throw new Error('深さは0〜12で指定してください。');
  const trace = [];
  let expansions = 0;
  function expand(text, depth, stack) {
    return text.replace(TOKEN, (_, request) => {
      if (++expansions > 10000) throw new Error('展開が終了しません。候補を確認してください。');
      const match = request.match(/^(.*)\((ally|enemy|common)\)$/);
      const keyword = match ? match[1] : request;
      const side = match ? match[2] : null;
      const key = side ? `${keyword}(${side})` : keyword;
      let candidates = (pool.get(keyword) ?? []).filter(entry => !side || entry.side === side || (side !== 'common' && entry.side === 'common'));
      let fallback = false;
      if (!candidates.length) {
        fallback = true;
        candidates = (defaults[key] ?? []).map(value => ({ value, side, source: 'default' }));
      }
      if (!candidates.length) throw new Error(`${key}: 候補がありません。`);
      let terminal = false;
      if (depth >= maxDepth) {
        const endings = candidates.filter(entry => !entry.value.includes('['));
        if (endings.length) {
          candidates = endings;
          terminal = true;
        } else if (stack.includes(key)) {
          throw new Error(`${key}: 循環する定義に終端候補がありません。`);
        }
      }
      const selected = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
      trace.push({ key, depth, ...selected, fallback, terminal });
      return expand(selected.value, depth + 1, [...stack, key]);
    });
  }
  return { text: expand(template, 0, []), trace };
}
