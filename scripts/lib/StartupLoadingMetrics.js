function unionDuration(events) {
  const threads = new Map();
  for (const event of events) {
    const key = `${event.pid}:${event.tid}`;
    if (!threads.has(key)) threads.set(key, []);
    threads.get(key).push([event.ts, event.ts + event.dur]);
  }
  let total = 0;
  for (const intervals of threads.values()) {
    intervals.sort((a, b) => a[0] - b[0]);
    let end = -Infinity;
    for (const [start, next] of intervals) { total += Math.max(0, next - Math.max(start, end)); end = Math.max(end, next); }
  }
  return total / 1000;
}

/** Durations within each category are unioned; categories may overlap, never add them. */
export function summarizeTrace(trace) {
  const complete = trace.traceEvents.filter(event => event.ph === 'X' && Number.isFinite(event.dur));
  const compile = complete.filter(event => /^(v8\.compile)/i.test(event.name)
    || ['V8.ParseProgram', 'V8.ParseFunction', 'V8.PreParse', 'v8.parseOnBackgroundParsing'].includes(event.name));
  const execution = complete.filter(event => ['EvaluateScript', 'v8.evaluateModule', 'FunctionCall', 'RunMicrotasks'].includes(event.name));
  return { compileMs: unionDuration(compile), executionMs: unionDuration(execution), compileEvents: compile.length, executionEvents: execution.length };
}

export function summarizeResources(resources, until = Infinity) {
  const included = resources.filter(resource => resource.responseEnd <= until);
  const sum = key => included.reduce((total, resource) => total + resource[key], 0);
  return { count: included.length, transferBytes: sum('transferSize'), encodedBytes: sum('encodedBodySize'), decodedBytes: sum('decodedBodySize'),
    jsTransferBytes: included.filter(resource => /\.js(?:$|\?)/.test(resource.name)).reduce((total, resource) => total + resource.transferSize, 0) };
}

export function traceBetweenMarks(trace, marks, endName, startName = null) {
  const end = trace.traceEvents.find(event => event.name === endName && event.cat?.includes('user_timing'));
  const endMark = marks.find(mark => mark.name === endName);
  const startMark = startName ? marks.find(mark => mark.name === startName) : { startTime: 0 };
  if (!end || !endMark || !startMark) throw new Error(`Missing trace boundary: ${startName} -> ${endName}`);
  const start = end.ts - (endMark.startTime - startMark.startTime) * 1000;
  return { traceEvents: trace.traceEvents.filter(event => event.ph === 'X' && event.ts + event.dur > start && event.ts < end.ts)
    .map(event => ({ ...event, ts: Math.max(start, event.ts), dur: Math.min(event.ts + event.dur, end.ts) - Math.max(start, event.ts) })) };
}
