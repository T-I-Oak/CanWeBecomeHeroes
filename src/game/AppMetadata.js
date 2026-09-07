import packageJson from '../../package.json' with { type: 'json' };

export const APP_VERSION = packageJson.version;
export const APP_COPYRIGHT = Object.freeze({
  holder: 'T.I.OAK',
  year: '2026',
  portal: 'GameWorks OAK',
  portalUrl: 'https://t-i-oak.github.io/GameWorksOAK/',
});
