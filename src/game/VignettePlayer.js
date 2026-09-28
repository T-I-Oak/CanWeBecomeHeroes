import { VIGNETTE_STAGE_HEIGHT, VIGNETTE_STAGE_WIDTH } from './VignetteStage.js';

const TIME_EPSILON = 1e-6;
const STEP_ENVELOPE_SECONDS = 0.1;
const FULL_CLIP = Object.freeze({ x: 0, y: 0, width: VIGNETTE_STAGE_WIDTH, height: VIGNETTE_STAGE_HEIGHT });
const CLOSED_CLIP = Object.freeze({ x: VIGNETTE_STAGE_WIDTH / 2, y: VIGNETTE_STAGE_HEIGHT / 2, width: 0, height: 0 });

const COMMAND_DEFAULTS = Object.freeze({
  background: Object.freeze({ asset: '', scrollX: 0 }),
  facing: Object.freeze({
    instanceId: '', direction: 'right', stepDistance: 0, forwardSeconds: 0, backSeconds: 0, phase: 0, chipRadius: 96, fillColor: '#ffffff',
  }),
  pinchOut: Object.freeze({ seconds: 0, wait: -1 }),
  pinchIn: Object.freeze({ seconds: 0, wait: -1 }),
  position: Object.freeze({ instanceId: '', x: 0, y: 0, seconds: 0, wait: -1 }),
  line: Object.freeze({
    instanceId: '', text: '', width: 512, direction: 'down', seconds: 0, wait: -1, borderColor: '#9b7142', backgroundColor: '#1c140c', backgroundOpacity: 0.6, color: '#f4ead2', outlineColor: '#1c140c', outlineWidth: 2,
  }),
});

function commandWithDefaults(command) {
  return { ...COMMAND_DEFAULTS[command.type], ...command };
}

function copyClip(clip) {
  return { x: clip.x, y: clip.y, width: clip.width, height: clip.height };
}

function lerpNumber(from, to, amount) {
  return from + (to - from) * amount;
}

function stepWave(cycle, timeSeconds) {
  if (!cycle || !(cycle.stepDistance > 0)) return 0;
  const period = cycle.forwardSeconds + cycle.backSeconds;
  if (!(period > 0)) return 0;
  const elapsed = timeSeconds - cycle.startedAt;
  let u = (cycle.phase + elapsed / period) % 1;
  if (u < 0) u += 1;
  const forwardPortion = cycle.forwardSeconds / period;
  if (u < forwardPortion) return cycle.stepDistance * u / forwardPortion;
  const backPortion = cycle.backSeconds / period;
  const backAmount = (u - forwardPortion) / backPortion;
  return cycle.stepDistance * (1 - backAmount);
}

function envelopeFactor(envelope, timeSeconds) {
  if (!envelope) return 1;
  if (!(envelope.seconds > 0)) return envelope.to;
  const amount = Math.min(1, Math.max(0, (timeSeconds - envelope.startedAt) / envelope.seconds));
  return envelope.from + (envelope.to - envelope.from) * amount;
}

export function facingStepOffset(facing, timeSeconds) {
  if (!facing) return 0;
  const cycle = facing.cycle ?? facing;
  return stepWave(cycle, timeSeconds) * envelopeFactor(facing.envelope, timeSeconds);
}

export function backgroundDrawOffset(background, timeSeconds, width) {
  if (!background || !(width > 0)) return 0;
  const displacement = background.scrollX * (timeSeconds - background.startedAt);
  return ((displacement % width) + width) % width;
}

export function createVignettePlayback(scenario) {
  const instances = new Map((scenario.instances ?? []).map((instance) => [instance.id, { position: null, facing: null }]));
  const playback = {
    scenario,
    time: 0,
    index: 0,
    gateUntil: null,
    done: false,
    tweens: [],
    background: null,
    instances,
    view: { clip: copyClip(CLOSED_CLIP), offsetX: 0, offsetY: 0, opacity: 1 },
    line: null,
    lines: [],
    lineSerial: 0,
  };
  startReadyCommands(playback);
  return playback;
}

export function updateVignettePlayback(playback, deltaSeconds) {
  if (playback.done) return playback;
  playback.time += deltaSeconds;
  applyTweens(playback);
  if (playback.gateUntil !== null && playback.time + TIME_EPSILON < playback.gateUntil) return playback;
  playback.gateUntil = null;
  startReadyCommands(playback);
  return playback;
}

function lerpRecord(from, to, amount) {
  return Object.fromEntries(Object.keys(to).map((key) => [key, lerpNumber(from[key], to[key], amount)]));
}

function applyTweens(playback) {
  playback.tweens = playback.tweens.filter((tween) => {
    const elapsed = playback.time - tween.t0;
    if (elapsed + TIME_EPSILON < tween.seconds) {
      tween.apply(lerpRecord(tween.from, tween.to, Math.max(0, elapsed / tween.seconds)));
      return true;
    }
    tween.apply(tween.to);
    if (tween.finish) tween.finish();
    return false;
  });
}

function startReadyCommands(playback) {
  const commands = playback.scenario.commands ?? [];
  while (playback.index < commands.length && playback.gateUntil === null) {
    const command = commandWithDefaults(commands[playback.index]);
    playback.index += 1;
    startCommand(playback, command);
  }
  if (playback.index >= commands.length && playback.gateUntil === null) playback.done = true;
}

function startCommand(playback, command) {
  if (command.type === 'background') {
    playback.background = { asset: command.asset, scrollX: command.scrollX, startedAt: playback.time };
    return;
  }
  if (command.type === 'facing') {
    const instance = playback.instances.get(command.instanceId);
    const previous = instance.facing;
    const previousFactor = previous ? envelopeFactor(previous.envelope, playback.time) : 0;
    const wasStepping = previous?.cycle?.stepDistance > 0 && previousFactor > 0;
    const cycle = command.stepDistance > 0
      ? {
        stepDistance: command.stepDistance,
        forwardSeconds: command.forwardSeconds,
        backSeconds: command.backSeconds,
        phase: command.phase,
        startedAt: playback.time,
      }
      : wasStepping
        ? previous.cycle
        : { stepDistance: 0, forwardSeconds: 0, backSeconds: 0, phase: 0, startedAt: playback.time };
    const envelope = command.stepDistance > 0
      ? { from: wasStepping ? previousFactor : 0, to: 1, startedAt: playback.time, seconds: wasStepping && previousFactor >= 1 ? 0 : STEP_ENVELOPE_SECONDS }
      : wasStepping
        ? { from: previousFactor, to: 0, startedAt: playback.time, seconds: STEP_ENVELOPE_SECONDS }
        : { from: 0, to: 0, startedAt: playback.time, seconds: 0 };
    instance.facing = {
      direction: command.direction,
      stepDistance: command.stepDistance,
      forwardSeconds: command.forwardSeconds,
      backSeconds: command.backSeconds,
      phase: command.phase,
      chipRadius: command.chipRadius,
      fillColor: command.fillColor,
      startedAt: playback.time,
      cycle,
      envelope,
    };
    return;
  }
  if (command.type === 'pinchOut' || command.type === 'pinchIn') {
    const to = command.type === 'pinchOut' ? FULL_CLIP : CLOSED_CLIP;
    beginTween(playback, {
      key: 'clip',
      seconds: command.seconds,
      from: copyClip(playback.view.clip),
      to: copyClip(to),
      apply: (clip) => { playback.view.clip = clip; },
    });
    holdForWait(playback, command);
    return;
  }
  if (command.type === 'position') {
    const instance = playback.instances.get(command.instanceId);
    const from = instance.position ? { ...instance.position } : { x: command.x, y: command.y };
    beginTween(playback, {
      key: `position:${command.instanceId}`,
      seconds: command.seconds,
      from,
      to: { x: command.x, y: command.y },
      apply: (position) => { instance.position = position; },
    });
    holdForWait(playback, command);
    return;
  }
  if (command.type === 'line') {
    const serial = playback.lineSerial;
    playback.lineSerial += 1;
    const line = {
      serial,
      instanceId: command.instanceId,
      text: command.text,
      width: command.width,
      direction: command.direction,
      borderColor: command.borderColor,
      backgroundColor: command.backgroundColor,
      backgroundOpacity: command.backgroundOpacity,
      color: command.color,
      outlineColor: command.outlineColor,
      outlineWidth: command.outlineWidth,
    };
    playback.lines.push(line);
    playback.line = line;
    beginTween(playback, {
      key: `line:${serial}`,
      seconds: command.seconds,
      from: { x: 0, y: 0 },
      to: { x: 0, y: 0 },
      apply: () => {},
      finish: () => {
        playback.lines = playback.lines.filter((current) => current.serial !== serial);
        if (playback.line?.serial === serial) playback.line = playback.lines.at(-1) ?? null;
      },
    });
    holdForWait(playback, command);
  }
}

function beginTween(playback, tween) {
  playback.tweens = playback.tweens.filter((current) => current.key !== tween.key);
  if (!(tween.seconds > 0)) {
    tween.apply(tween.to);
    if (tween.finish) tween.finish();
    return;
  }
  tween.apply(tween.from);
  playback.tweens.push({ ...tween, t0: playback.time });
}

function holdForWait(playback, command) {
  if (command.wait > 0) playback.gateUntil = playback.time + command.wait;
  else if (command.wait < 0 && command.seconds > 0) playback.gateUntil = playback.time + command.seconds;
}
