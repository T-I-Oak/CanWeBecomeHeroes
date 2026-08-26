export const STATUS_VISUALS = Object.freeze({
  power: Object.freeze({ iconPath: '/assets/status/power.png', tagBaseColor: '#8d5b3d', gaugeFrameColor: '#594238' }),
  magic: Object.freeze({ iconPath: '/assets/status/magic.png', tagBaseColor: '#66429b', gaugeFrameColor: '#4b3c63' }),
  speed: Object.freeze({ iconPath: '/assets/status/speed.png', tagBaseColor: '#1b8eab', gaugeFrameColor: '#285b5a' }),
  negotiation: Object.freeze({ iconPath: '/assets/status/negotiation.png', tagBaseColor: '#c89025', gaugeFrameColor: '#695528' }),
  luck: Object.freeze({ iconPath: '/assets/status/luck.png', tagBaseColor: '#d66d9a', gaugeFrameColor: '#8d3f68' }),
  stamina: Object.freeze({ iconPath: '/assets/status/stamina.png', gaugeFrameColor: '#3d4d62' }),
  hp: Object.freeze({ iconPath: '/assets/status/hp.png', gaugeFrameColor: '#8d3f43' }),
});

export function getStatusVisual(key) {
  const visual = STATUS_VISUALS[key];
  if (!visual) throw new RangeError(`Unknown status visual: ${key}`);
  return visual;
}
