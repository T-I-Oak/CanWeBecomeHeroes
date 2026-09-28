import { getHeroProfessionDefinition } from './HeroFactory.js';

const WALK_SPEED = 90;
const OPENING_VIGNETTE_ID = 'opening';
const AVERY_BRIAR_SCRIPT_ID = 'AveryBriar';
const AVERY_BRIAR_SPEAKERS = Object.freeze(['Avery', 'Briar', 'Avery', 'Avery', 'Avery', 'Briar', 'Briar']);
const CASEY_DARCY_SCRIPT_ID = 'CaseyDarcy';
const CASEY_DARCY_SPEAKERS = Object.freeze(['Casey', 'Darcy', 'Darcy', 'Casey', 'Darcy', 'Darcy']);
const ELLIS_FINLEY_SCRIPT_ID = 'EllisFinley';
const ELLIS_FINLEY_SPEAKERS = Object.freeze(['Ellis', 'Finley', 'Ellis', 'Finley', 'Ellis', 'Finley']);
const GARNET_HARPER_SCRIPT_ID = 'GarnetHarper';
const GARNET_HARPER_SPEAKERS = Object.freeze(['Garnet', 'Garnet', 'Harper', 'Garnet', 'Harper', 'Garnet', 'Garnet', 'Harper']);
const DASH_SPEED_SCALE = 8;
const CHASE_SPEED_SCALE = 2;
const RETURN_SPEED_SCALE = 4;
const ELLIS_DASH_SPEED = WALK_SPEED * DASH_SPEED_SCALE;
const RETURN_SPEED = WALK_SPEED * RETURN_SPEED_SCALE;
const OPENING_LINE_WIDTH = 528;
const LINE_SECONDS = 3;
const PINCH_SECONDS = 0.7;
const FOOT_Y = 248;
const ENTER_X = -80;
const LEAD_STOP_X = 200;
const PARTNER_STOP_X = 70;
const LEAD_PHASE = 0;
const PARTNER_PHASE = 0.25;
const DEPARTURE_SECONDS = 2.4;
const PARTNER_DEPARTURE_WAIT = 1.5;
const DEPARTURE_DISTANCE = WALK_SPEED * DEPARTURE_SECONDS;
const LEAD_DEPARTURE_X = LEAD_STOP_X + DEPARTURE_DISTANCE;
const PARTNER_DEPARTURE_X = PARTNER_STOP_X + DEPARTURE_DISTANCE;
const CHARACTER_GAP = LEAD_STOP_X - PARTNER_STOP_X;
const GARNET_FIRST_X = LEAD_STOP_X + CHARACTER_GAP * 2;
const HARPER_FIRST_X = PARTNER_STOP_X + CHARACTER_GAP * 2;
const GARNET_ENTER_X = ENTER_X;
const HARPER_ENTER_X = ENTER_X - CHARACTER_GAP;
const CASEY_STOP_X = 350;
const DARCY_STOP_X = 210;
const CASEY_ENTER_X = 640;

const FACING = {
  direction: 'right',
  stepDistance: 24,
  forwardSeconds: 0.14,
  backSeconds: 0.5,
  chipRadius: 56,
  fillColor: '#bfdbfe',
};

const BASIC_SCROLL_X = -(FACING.stepDistance / FACING.backSeconds);
const ELLIS_STOP_X = LEAD_STOP_X + FACING.stepDistance;
const ELLIS_DEPARTURE_X = ELLIS_STOP_X + DEPARTURE_DISTANCE;

function backgroundCommand(scrollX = BASIC_SCROLL_X) {
  return { type: 'background', asset: '/assets/vignette/village.png', scrollX };
}

function pinchCommand(type) {
  return { type, seconds: PINCH_SECONDS, wait: -1 };
}

function facingCommand(instanceId, phase, speedScale = 1, overrides = {}) {
  return {
    type: 'facing',
    instanceId,
    ...FACING,
    phase,
    forwardSeconds: FACING.forwardSeconds / speedScale,
    backSeconds: FACING.backSeconds / speedScale,
    ...overrides,
  };
}

function positionCommand(instanceId, x, seconds, wait = -1) {
  return { type: 'position', instanceId, x, y: FOOT_Y, seconds, wait };
}

function linesFor(firstSpeakerId) {
  return (instanceId, text, options = {}) => ({
    type: 'line',
    instanceId,
    text,
    width: OPENING_LINE_WIDTH,
    seconds: LINE_SECONDS,
    wait: options.wait ?? -1,
    direction: instanceId === firstSpeakerId ? 'up' : 'down',
  });
}

function entranceCommands(instanceId, phase, stopX) {
  return [
    positionCommand(instanceId, ENTER_X, 0),
    facingCommand(instanceId, phase),
    positionCommand(instanceId, stopX, (stopX - ENTER_X) / WALK_SPEED),
  ];
}

function basicDepartureCommands(frontId, backId) {
  return [
    positionCommand(frontId, LEAD_DEPARTURE_X, DEPARTURE_SECONDS, 0),
    positionCommand(backId, PARTNER_DEPARTURE_X, DEPARTURE_SECONDS, PARTNER_DEPARTURE_WAIT),
  ];
}

function requireScriptSpeakers(script, speakers, scriptId) {
  if (script.length !== speakers.length || script.some((line, index) => line.heroId !== speakers[index])) {
    throw new RangeError(`Vignette script speakers do not match ${scriptId}: vignette.opening.scripts.${scriptId}`);
  }
}

function characters(frontId, backId) {
  return [
    { id: frontId, kind: 'character', heroId: frontId },
    { id: backId, kind: 'character', heroId: backId },
  ];
}

function hasHeroes(heroIds, frontId, backId) {
  return heroIds.includes(frontId) && heroIds.includes(backId);
}

export function createStartVignette({ professionIds, textRepository }) {
  if (!textRepository) throw new RangeError('A start vignette requires a text repository.');
  if (!Array.isArray(professionIds) || professionIds.length !== 2) throw new RangeError('A start vignette requires exactly two heroes.');
  const heroIds = professionIds.map((professionId) => getHeroProfessionDefinition(professionId).heroId);
  return averyBriarScenario(heroIds, textRepository)
    || caseyDarcyScenario(heroIds, textRepository)
    || ellisFinleyScenario(heroIds, textRepository)
    || garnetHarperScenario(heroIds, textRepository)
    || basicScenario(heroIds, textRepository);
}

function basicScenario(heroIds, textRepository) {
  const [leadHeroId, partnerHeroId] = heroIds;
  const line = linesFor('lead');
  return {
    instances: [
      { id: 'lead', kind: 'character', heroId: leadHeroId },
      { id: 'partner', kind: 'character', heroId: partnerHeroId },
    ],
    commands: [
      backgroundCommand(),
      pinchCommand('pinchOut'),
      ...entranceCommands('lead', LEAD_PHASE, LEAD_STOP_X),
      line('lead', textRepository.getVignetteLine(OPENING_VIGNETTE_ID, 'lead', leadHeroId)),
      ...entranceCommands('partner', PARTNER_PHASE, PARTNER_STOP_X),
      line('partner', textRepository.getVignetteLine(OPENING_VIGNETTE_ID, 'partner', partnerHeroId)),
      ...basicDepartureCommands('lead', 'partner'),
      pinchCommand('pinchIn'),
    ],
  };
}

function averyBriarScenario(heroIds, textRepository) {
  if (!hasHeroes(heroIds, 'Avery', 'Briar')) return null;
  const script = textRepository.getVignetteScript(OPENING_VIGNETTE_ID, AVERY_BRIAR_SCRIPT_ID);
  requireScriptSpeakers(script, AVERY_BRIAR_SPEAKERS, AVERY_BRIAR_SCRIPT_ID);
  const line = linesFor('Avery');
  const averyWalkSeconds = LINE_SECONDS * 2 + PINCH_SECONDS;
  const briarWalkSeconds = LINE_SECONDS + PINCH_SECONDS;
  return {
    instances: characters('Avery', 'Briar'),
    commands: [
      backgroundCommand(),
      pinchCommand('pinchOut'),
      ...entranceCommands('Avery', LEAD_PHASE, LEAD_STOP_X),
      line('Avery', script[0].text),
      ...entranceCommands('Briar', PARTNER_PHASE, PARTNER_STOP_X),
      line('Briar', script[1].text),
      line('Avery', script[2].text),
      line('Avery', script[3].text),
      positionCommand('Avery', LEAD_STOP_X + WALK_SPEED * averyWalkSeconds, averyWalkSeconds, 0),
      line('Avery', script[4].text, { wait: 0 }),
      line('Briar', script[5].text),
      facingCommand('Briar', PARTNER_PHASE, CHASE_SPEED_SCALE),
      positionCommand('Briar', PARTNER_STOP_X + WALK_SPEED * CHASE_SPEED_SCALE * briarWalkSeconds, briarWalkSeconds, 0),
      line('Briar', script[6].text),
      pinchCommand('pinchIn'),
    ],
  };
}

function caseyDarcyScenario(heroIds, textRepository) {
  if (!hasHeroes(heroIds, 'Casey', 'Darcy')) return null;
  const script = textRepository.getVignetteScript(OPENING_VIGNETTE_ID, CASEY_DARCY_SCRIPT_ID);
  requireScriptSpeakers(script, CASEY_DARCY_SPEAKERS, CASEY_DARCY_SCRIPT_ID);
  const line = linesFor('Casey');
  const departureSeconds = LINE_SECONDS + PINCH_SECONDS;
  const enterSeconds = (CASEY_ENTER_X - CASEY_STOP_X) / WALK_SPEED;
  return {
    instances: characters('Casey', 'Darcy'),
    commands: [
      backgroundCommand(0),
      pinchCommand('pinchOut'),
      positionCommand('Casey', CASEY_ENTER_X, 0),
      facingCommand('Casey', LEAD_PHASE, 1, { direction: 'left' }),
      positionCommand('Casey', CASEY_STOP_X, enterSeconds),
      facingCommand('Casey', LEAD_PHASE, 1, { direction: 'left', stepDistance: 0 }),
      line('Casey', script[0].text),
      positionCommand('Darcy', ENTER_X, 0),
      facingCommand('Darcy', PARTNER_PHASE),
      positionCommand('Darcy', DARCY_STOP_X, enterSeconds),
      facingCommand('Darcy', PARTNER_PHASE, 1, { direction: 'right', stepDistance: 0 }),
      line('Darcy', script[1].text),
      line('Darcy', script[2].text),
      line('Casey', script[3].text),
      line('Darcy', script[4].text),
      facingCommand('Casey', LEAD_PHASE),
      facingCommand('Darcy', PARTNER_PHASE),
      positionCommand('Casey', CASEY_STOP_X + WALK_SPEED * departureSeconds, departureSeconds, 0),
      positionCommand('Darcy', DARCY_STOP_X + WALK_SPEED * departureSeconds, departureSeconds, 0),
      line('Darcy', script[5].text),
      pinchCommand('pinchIn'),
    ],
  };
}

function ellisFinleyScenario(heroIds, textRepository) {
  if (!hasHeroes(heroIds, 'Ellis', 'Finley')) return null;
  const script = textRepository.getVignetteScript(OPENING_VIGNETTE_ID, ELLIS_FINLEY_SCRIPT_ID);
  requireScriptSpeakers(script, ELLIS_FINLEY_SPEAKERS, ELLIS_FINLEY_SCRIPT_ID);
  const line = linesFor('Ellis');
  return {
    instances: characters('Ellis', 'Finley'),
    commands: [
      backgroundCommand(-WALK_SPEED),
      pinchCommand('pinchOut'),
      ...entranceCommands('Finley', PARTNER_PHASE, PARTNER_STOP_X),
      positionCommand('Ellis', ENTER_X, 0),
      facingCommand('Ellis', LEAD_PHASE),
      positionCommand('Ellis', ELLIS_STOP_X, (ELLIS_STOP_X - ENTER_X) / ELLIS_DASH_SPEED),
      facingCommand('Ellis', LEAD_PHASE, 1, { direction: 'left', forwardSeconds: FACING.backSeconds, backSeconds: FACING.forwardSeconds }),
      line('Ellis', script[0].text),
      line('Finley', script[1].text),
      line('Ellis', script[2].text),
      line('Finley', script[3].text),
      line('Ellis', script[4].text),
      line('Finley', script[5].text),
      facingCommand('Ellis', LEAD_PHASE),
      facingCommand('Finley', PARTNER_PHASE),
      positionCommand('Ellis', ELLIS_DEPARTURE_X, DEPARTURE_SECONDS, 0),
      positionCommand('Finley', PARTNER_DEPARTURE_X, DEPARTURE_SECONDS),
      pinchCommand('pinchIn'),
    ],
  };
}

function garnetHarperScenario(heroIds, textRepository) {
  if (!hasHeroes(heroIds, 'Garnet', 'Harper')) return null;
  const script = textRepository.getVignetteScript(OPENING_VIGNETTE_ID, GARNET_HARPER_SCRIPT_ID);
  requireScriptSpeakers(script, GARNET_HARPER_SPEAKERS, GARNET_HARPER_SCRIPT_ID);
  const line = linesFor('Garnet');
  const shiftSeconds = (CHARACTER_GAP * 2) / RETURN_SPEED;
  const enterSeconds = (GARNET_FIRST_X - GARNET_ENTER_X) / WALK_SPEED;
  return {
    instances: characters('Garnet', 'Harper'),
    commands: [
      backgroundCommand(-WALK_SPEED),
      pinchCommand('pinchOut'),
      positionCommand('Garnet', GARNET_ENTER_X, 0),
      facingCommand('Garnet', LEAD_PHASE),
      positionCommand('Harper', HARPER_ENTER_X, 0),
      facingCommand('Harper', PARTNER_PHASE),
      positionCommand('Garnet', GARNET_FIRST_X, enterSeconds, 0),
      positionCommand('Harper', HARPER_FIRST_X, enterSeconds),
      line('Garnet', script[0].text),
      line('Garnet', script[1].text),
      line('Harper', script[2].text),
      line('Garnet', script[3].text),
      positionCommand('Garnet', LEAD_STOP_X, shiftSeconds),
      line('Harper', script[4].text),
      positionCommand('Harper', PARTNER_STOP_X, shiftSeconds),
      line('Garnet', script[5].text),
      line('Garnet', script[6].text),
      line('Harper', script[7].text),
      ...basicDepartureCommands('Garnet', 'Harper'),
      pinchCommand('pinchIn'),
    ],
  };
}
