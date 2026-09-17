export const STATUS_VISUALS = Object.freeze({
  power: Object.freeze({ iconPath: '/assets/status/power.png', tagBaseColor: '#8d5b3d', gaugeFrameColor: '#594238', textColor: '#c99062' }),
  magic: Object.freeze({ iconPath: '/assets/status/magic.png', tagBaseColor: '#66429b', gaugeFrameColor: '#4b3c63', textColor: '#a77ae2' }),
  speed: Object.freeze({ iconPath: '/assets/status/speed.png', tagBaseColor: '#1b8eab', gaugeFrameColor: '#285b5a', textColor: '#48cbe5' }),
  negotiation: Object.freeze({ iconPath: '/assets/status/negotiation.png', tagBaseColor: '#c89025', gaugeFrameColor: '#695528', textColor: '#efc454' }),
  luck: Object.freeze({ iconPath: '/assets/status/luck.png', tagBaseColor: '#d66d9a', gaugeFrameColor: '#8d3f68', textColor: '#f19cc2' }),
  stamina: Object.freeze({ iconPath: '/assets/status/stamina.png', gaugeFrameColor: '#3d4d62', textColor: '#78df91' }),
  hp: Object.freeze({ iconPath: '/assets/status/hp.png', gaugeFrameColor: '#8d3f43', textColor: '#ec7777' }),
  durability: Object.freeze({ iconPath: '/assets/status/durability.png', textColor: '#ec7777' }),
  weight: Object.freeze({ iconPath: '/assets/status/weight.png', gaugeFrameColor: '#414954', gaugeActiveColor: '#cbd3db', textColor: '#cbd3db' }),
});

export function getStatusVisual(key) {
  const visual = STATUS_VISUALS[key];
  if (!visual) throw new RangeError(`Unknown status visual: ${key}`);
  return visual;
}

export function getVitalGaugeColor(value) {
  if (value < 2) return '#db5b5b';
  if (value < 3) return '#e59a3f';
  return '#54c96b';
}
