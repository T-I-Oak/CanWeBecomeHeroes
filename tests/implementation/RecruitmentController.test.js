import test from 'node:test';
import assert from 'node:assert/strict';
import RecruitmentController, { MAX_RECRUITED_HERO_COUNT, selectRecruitmentCandidate } from '../../src/game/RecruitmentController.js';
import { HERO_PROFESSION_IDS } from '../../src/game/HeroFactory.js';

function createEliteStage(id = 'elite-stage') {
  return { id, kind: 'elite' };
}

test('preparing a candidate does not provision anything until the selection is committed once', () => {
  const provisioned = [];
  const recruitment = new RecruitmentController({ random: () => 0.5, onRecruit: (profession) => provisioned.push(profession) });
  const selection = recruitment.prepareCompletedStage({ stage: createEliteStage(), stageState: 'complete', heroes: [] });
  assert.equal(selection.reason, 'candidate-selected');
  assert.equal(selection.recruited, false);
  assert.equal(recruitment.joinedCount, 0);
  assert.deepEqual(provisioned, []);
  const result = recruitment.commitRecruitment(selection);
  assert.equal(result.recruited, true);
  assert.equal(recruitment.joinedCount, 1);
  assert.deepEqual(provisioned, [HERO_PROFESSION_IDS[4]]);
  assert.throws(() => recruitment.commitRecruitment(selection), /pending candidate/);
});

test('candidate selection maps the eight equal random intervals to all hero professions', () => {
  assert.deepEqual(
    HERO_PROFESSION_IDS.map((profession, index) => selectRecruitmentCandidate(HERO_PROFESSION_IDS, () => (index + 0.5) / HERO_PROFESSION_IDS.length)),
    HERO_PROFESSION_IDS,
  );
});

test('elite clear samples one profession from all eight heroes and auto-recruits an unjoined candidate', () => {
  const recruited = [];
  const recruitment = new RecruitmentController({
    random: () => 0.5,
    onRecruit: (profession) => {
      recruited.push(profession);
      return { profession };
    },
  });

  const result = recruitment.processCompletedStage({
    stage: createEliteStage(),
    stageState: 'complete',
    heroes: [{ profession: HERO_PROFESSION_IDS[0] }, { profession: HERO_PROFESSION_IDS[1] }],
  });

  assert.equal(result.candidateProfession, HERO_PROFESSION_IDS[4]);
  assert.equal(result.recruited, true);
  assert.deepEqual(recruited, [HERO_PROFESSION_IDS[4]]);
  assert.equal(recruitment.joinedCount, 1);
});

test('an already joined candidate is not recruited', () => {
  const recruitment = new RecruitmentController({
    random: () => 0,
    onRecruit: () => assert.fail('Joined heroes must not be recruited again.'),
  });

  const result = recruitment.processCompletedStage({
    stage: createEliteStage(),
    stageState: 'complete',
    heroes: [{ profession: HERO_PROFESSION_IDS[0] }, { profession: HERO_PROFESSION_IDS[1] }],
  });

  assert.equal(result.candidateProfession, HERO_PROFESSION_IDS[0]);
  assert.equal(result.recruited, false);
  assert.equal(result.reason, 'already-joined');
  assert.equal(recruitment.joinedCount, 0);
});

test('the same elite completion is processed once', () => {
  const recruited = [];
  const recruitment = new RecruitmentController({ random: () => 0.5, onRecruit: (profession) => recruited.push(profession) });
  const input = {
    stage: createEliteStage(),
    stageState: 'complete',
    heroes: [{ profession: HERO_PROFESSION_IDS[0] }, { profession: HERO_PROFESSION_IDS[1] }],
  };

  recruitment.processCompletedStage(input);
  const result = recruitment.processCompletedStage(input);

  assert.equal(result.reason, 'already-processed');
  assert.deepEqual(recruited, [HERO_PROFESSION_IDS[4]]);
  assert.equal(recruitment.joinedCount, 1);
});

test('recruitment stops after the two available preparation slots are filled', () => {
  const recruited = [];
  const recruitment = new RecruitmentController({ random: () => 0.5, onRecruit: (profession) => recruited.push(profession) });
  const heroes = [{ profession: HERO_PROFESSION_IDS[0] }, { profession: HERO_PROFESSION_IDS[1] }];

  recruitment.processCompletedStage({ stage: createEliteStage('elite-1'), stageState: 'complete', heroes });
  recruitment.processCompletedStage({ stage: createEliteStage('elite-2'), stageState: 'complete', heroes });
  const result = recruitment.processCompletedStage({ stage: createEliteStage('elite-3'), stageState: 'complete', heroes });

  assert.equal(MAX_RECRUITED_HERO_COUNT, 2);
  assert.equal(recruited.length, 2);
  assert.equal(result.recruited, false);
  assert.equal(result.reason, 'recruitment-capacity-reached');
});
