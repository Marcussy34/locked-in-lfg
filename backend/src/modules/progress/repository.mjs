import { badRequest, notFound } from '../../lib/errors.mjs';
import { appConfig } from '../../config.mjs';
import {
  hasDatabase,
  query,
  queryAsWallet,
  withTransactionAsWallet,
} from '../../lib/db.mjs';
import {
  hasLockVaultRelayConfig,
  publishFuelBurnToLockVault,
  publishHarvestToLockVault,
  publishMissConsequenceToLockVault,
  publishVerifiedCompletionToLockVault,
  readLockAccountSnapshot,
  readLockAccountTiming,
} from '../../lib/lockVault.mjs';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FUEL_DAILY_REWARD = 1;
const DEFAULT_FUEL_CAP = 7;
const SAVER_REDIRECT_BPS_BY_COUNT = {
  0: 0,
  1: 1000,
  2: 2000,
  3: 2000,
};

function assertAttemptId(attemptId) {
  if (!attemptId || typeof attemptId !== 'string' || !UUID_RE.test(attemptId)) {
    throw badRequest('attemptId must be a valid UUID', 'INVALID_ATTEMPT_ID');
  }
  return attemptId;
}

function normalizeAnswerText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function diffDays(fromDay, toDay) {
  const from = new Date(`${fromDay}T00:00:00.000Z`).getTime();
  const to = new Date(`${toDay}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

const DAY_MS = 24 * 60 * 60 * 1000;

function getSaverRedirectBps(saverCount) {
  return SAVER_REDIRECT_BPS_BY_COUNT[saverCount] ?? 10000;
}

function percentageOfAmount(amount, bps) {
  return Math.floor((Number(amount) * Number(bps)) / 10_000);
}

function getSkrMultiplierBps(skrTier) {
  if (skrTier >= 3) return 11_000;
  if (skrTier === 2) return 10_500;
  if (skrTier === 1) return 10_200;
  return 10_000;
}

function percentageOfAmountAtomic(amount, bps) {
  return (BigInt(amount) * BigInt(bps)) / 10_000n;
}

function epochDayToIsoDate(epochDay) {
  if (epochDay == null || Number(epochDay) < 0) {
    return null;
  }

  return new Date(Number(epochDay) * DAY_MS).toISOString().slice(0, 10);
}

function unixTimestampSecondsToIso(value) {
  if (value == null || Number(value) <= 0) {
    return null;
  }

  return new Date(Number(value) * 1000).toISOString();
}

function assertAnswers(answers) {
  if (!Array.isArray(answers)) {
    throw badRequest('answers must be an array', 'INVALID_ANSWERS');
  }

  const answerMap = new Map();

  for (const answer of answers) {
    if (!answer || typeof answer !== 'object') {
      throw badRequest('Each answer must be an object', 'INVALID_ANSWER_ITEM');
    }

    const questionId = answer.questionId;
    const answerText = answer.answerText;

    if (!questionId || typeof questionId !== 'string') {
      throw badRequest('Each answer requires questionId', 'MISSING_QUESTION_ID');
    }

    if (typeof answerText !== 'string') {
      throw badRequest('Each answer requires answerText', 'MISSING_ANSWER_TEXT');
    }

    if (answerMap.has(questionId)) {
      throw badRequest(
        `Duplicate answer for question ${questionId}`,
        'DUPLICATE_QUESTION_ANSWER',
      );
    }

    answerMap.set(questionId, answerText);
  }

  return answerMap;
}

async function getPublishedLessonVersion(client, lessonId) {
  const result = await client.query(
    `
      select id::text as "lessonVersionId"
      from lesson.lesson_versions
      where lesson_id = $1
        and state = 'published'
      order by published_at desc nulls last
      limit 1
    `,
    [lessonId],
  );

  if (result.rowCount === 0) {
    throw notFound('Lesson not found', 'LESSON_NOT_FOUND');
  }

  return result.rows[0];
}

async function readAttempt(client, walletAddress, lessonId, attemptId) {
  const result = await client.query(
    `
      select
        id::text as "attemptId",
        wallet_address as "walletAddress",
        lesson_id as "lessonId",
        lesson_version_id::text as "lessonVersionId",
        started_at as "startedAt",
        submitted_at as "submittedAt",
        score,
        accepted
      from lesson.user_lesson_attempts
      where id = $1::uuid
    `,
    [attemptId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  const attempt = result.rows[0];
  if (attempt.walletAddress !== walletAddress || attempt.lessonId !== lessonId) {
    throw badRequest('attemptId is already bound to a different lesson', 'ATTEMPT_ID_CONFLICT');
  }

  return attempt;
}

async function ensureAttempt(
  client,
  walletAddress,
  lessonId,
  attemptId,
  lessonVersionId,
  startedAt = null,
) {
  await client.query(
    `
      insert into lesson.user_lesson_attempts (
        id,
        wallet_address,
        lesson_id,
        lesson_version_id,
        started_at
      )
      values (
        $1::uuid,
        $2,
        $3,
        $4::uuid,
        coalesce($5::timestamptz, now())
      )
      on conflict (id) do nothing
    `,
    [attemptId, walletAddress, lessonId, lessonVersionId, startedAt],
  );

  const attempt = await readAttempt(client, walletAddress, lessonId, attemptId);
  if (!attempt) {
    throw notFound('Lesson attempt not found', 'ATTEMPT_NOT_FOUND');
  }

  return attempt;
}

async function listLessonQuestions(client, lessonVersionId) {
  const result = await client.query(
    `
      select
        q.id,
        q.question_type as "questionType",
        q.correct_answer as "correctAnswer",
        coalesce(
          json_agg(
            jsonb_build_object(
              'id', qo.id::text,
              'text', qo.option_text
            )
            order by qo.option_order
          ) filter (where qo.id is not null),
          '[]'::json
        ) as options
      from lesson.questions q
      left join lesson.question_options qo on qo.question_id = q.id
      where q.lesson_version_id = $1::uuid
      group by q.id, q.question_type, q.correct_answer, q.question_order
      order by q.question_order asc
    `,
    [lessonVersionId],
  );

  return result.rows;
}

async function getCourseIdForPublishedLesson(client, lessonId, lessonVersionId) {
  const result = await client.query(
    `
      select (payload->>'courseId') as "courseId"
      from lesson.published_lessons
      where lesson_id = $1
        and lesson_version_id = $2::uuid
      limit 1
    `,
    [lessonId, lessonVersionId],
  );

  if (result.rowCount === 0 || !result.rows[0].courseId) {
    throw notFound('Published lesson context not found', 'LESSON_CONTEXT_NOT_FOUND');
  }

  return result.rows[0].courseId;
}

async function ensureCourseRuntimeState(client, walletAddress, courseId) {
  await client.query(
    `
      insert into lesson.user_course_runtime_state (
        wallet_address,
        course_id,
        fuel_cap
      )
      values ($1, $2, $3)
      on conflict (wallet_address, course_id) do nothing
    `,
    [walletAddress, courseId, DEFAULT_FUEL_CAP],
  );

  const result = await client.query(
    `
      select
        wallet_address as "walletAddress",
        course_id as "courseId",
        current_streak as "currentStreak",
        longest_streak as "longestStreak",
        gauntlet_active as "gauntletActive",
        gauntlet_day as "gauntletDay",
        saver_count as "saverCount",
        saver_recovery_mode as "saverRecoveryMode",
        current_yield_redirect_bps as "currentYieldRedirectBps",
        extension_days as "extensionDays",
        fuel_counter as "fuelCounter",
        fuel_cap as "fuelCap",
        last_completed_day::text as "lastCompletedDay",
        last_miss_day::text as "lastMissDay",
        last_fuel_credit_day::text as "lastFuelCreditDay",
        last_brewer_burn_ts as "lastBrewerBurnTs"
      from lesson.user_course_runtime_state
      where wallet_address = $1
        and course_id = $2
      limit 1
    `,
    [walletAddress, courseId],
  );

  return result.rows[0];
}

function deriveFuelEarnStatus(state, completionDay) {
  if (state.saverRecoveryMode) return 'PAUSED_RECOVERY';
  if (state.fuelCounter >= state.fuelCap) return 'AT_CAP';
  if (state.lastFuelCreditDay === completionDay) return 'EARNED_TODAY';
  return 'AVAILABLE';
}

async function applyVerifiedCompletionToCourseRuntime(
  client,
  walletAddress,
  courseId,
  completionDay,
  rewardUnits,
) {
  const state = await ensureCourseRuntimeState(client, walletAddress, courseId);
  const sameDay = state.lastCompletedDay === completionDay;

  let currentStreak = state.currentStreak;
  let longestStreak = state.longestStreak;
  let gauntletActive = state.gauntletActive;
  let gauntletDay = state.gauntletDay;
  let saverCount = state.saverCount;
  let saverRecoveryMode = state.saverRecoveryMode;
  let currentYieldRedirectBps = state.currentYieldRedirectBps;

  if (!sameDay) {
    const consecutive =
      state.lastCompletedDay != null && diffDays(state.lastCompletedDay, completionDay) === 1;
    currentStreak = state.lastCompletedDay == null ? 1 : consecutive ? state.currentStreak + 1 : 1;
    longestStreak = Math.max(state.longestStreak, currentStreak);

    if (state.gauntletActive) {
      gauntletDay = Math.min(state.gauntletDay + 1, 8);
      gauntletActive = state.gauntletDay < 7;
    }
  }

  if (saverRecoveryMode && saverCount > 0) {
    saverCount = Math.max(0, saverCount - 1);
    saverRecoveryMode = saverCount > 0;
    currentYieldRedirectBps = getSaverRedirectBps(saverCount);
  }

  let fuelCounter = state.fuelCounter;
  let lastFuelCreditDay = state.lastFuelCreditDay;
  let fuelAwarded = 0;

  if (
    rewardUnits > 0 &&
    !saverRecoveryMode &&
    fuelCounter < state.fuelCap &&
    lastFuelCreditDay !== completionDay
  ) {
    fuelCounter = Math.min(state.fuelCap, fuelCounter + FUEL_DAILY_REWARD);
    lastFuelCreditDay = completionDay;
    fuelAwarded = fuelCounter > state.fuelCounter ? FUEL_DAILY_REWARD : 0;
  }

  await client.query(
    `
      update lesson.user_course_runtime_state
      set current_streak = $3,
          longest_streak = $4,
          gauntlet_active = $5,
          gauntlet_day = $6,
          saver_count = $7,
          saver_recovery_mode = $8,
          current_yield_redirect_bps = $9,
          fuel_counter = $10,
          last_completed_day = $11::date,
          last_fuel_credit_day = $12::date,
          updated_at = now()
      where wallet_address = $1
        and course_id = $2
    `,
    [
      walletAddress,
      courseId,
      currentStreak,
      longestStreak,
      gauntletActive,
      gauntletDay,
      saverCount,
      saverRecoveryMode,
      currentYieldRedirectBps,
      fuelCounter,
      completionDay,
      lastFuelCreditDay,
    ],
  );

  return {
    courseId,
    currentStreak,
    longestStreak,
    gauntletActive,
    gauntletDay,
    saverCount,
    saverRecoveryMode,
    currentYieldRedirectBps,
    extensionDays: state.extensionDays,
    fuelCounter,
    fuelCap: state.fuelCap,
    lastFuelCreditDay,
    lastBrewerBurnTs: state.lastBrewerBurnTs,
    fuelAwarded,
    fuelEarnStatus: deriveFuelEarnStatus(
      {
        ...state,
        saverCount,
        saverRecoveryMode,
        currentYieldRedirectBps,
        fuelCounter,
        lastFuelCreditDay,
      },
      completionDay,
    ),
  };
}

function gradeAnswers(questions, submittedAnswers) {
  const questionIds = new Set(questions.map((question) => question.id));
  for (const questionId of submittedAnswers.keys()) {
    if (!questionIds.has(questionId)) {
      throw badRequest(
        `Answer was provided for an unknown question: ${questionId}`,
        'UNKNOWN_QUESTION_ID',
      );
    }
  }

  const attempts = questions.map((question) => {
    const answerText = submittedAnswers.get(question.id) ?? '';
    const normalizedAnswer = normalizeAnswerText(answerText);
    const normalizedCorrectAnswer = normalizeAnswerText(question.correctAnswer);
    const isCorrect =
      normalizedAnswer.length > 0 && normalizedAnswer === normalizedCorrectAnswer;

    return {
      questionId: question.id,
      answerText: answerText.trim().length > 0 ? answerText.trim() : null,
      isCorrect,
    };
  });

  const correctAnswers = attempts.filter((attempt) => attempt.isCorrect).length;
  const totalQuestions = questions.length;
  const score =
    totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100);

  return {
    attempts,
    correctAnswers,
    totalQuestions,
    score,
  };
}

async function persistQuestionAttempts(client, attemptId, questionAttempts) {
  for (const attempt of questionAttempts) {
    await client.query(
      `
        insert into lesson.user_question_attempts (
          lesson_attempt_id,
          question_id,
          answer_text,
          is_correct
        )
        values (
          $1::uuid,
          $2,
          $3,
          $4
        )
        on conflict (lesson_attempt_id, question_id)
        do update set
          answer_text = excluded.answer_text,
          is_correct = excluded.is_correct
      `,
      [attemptId, attempt.questionId, attempt.answerText, attempt.isCorrect],
    );
  }
}

async function persistLessonProgress(
  client,
  walletAddress,
  lessonId,
  score,
  completedAt,
) {
  await client.query(
    `
      insert into lesson.user_lesson_progress (
        wallet_address,
        lesson_id,
        completed,
        score,
        completed_at,
        updated_at
      )
      values ($1, $2, true, $3, $4::timestamptz, now())
      on conflict (wallet_address, lesson_id)
      do update set
        completed = true,
        score = greatest(coalesce(lesson.user_lesson_progress.score, 0), excluded.score),
        completed_at = greatest(
          coalesce(lesson.user_lesson_progress.completed_at, excluded.completed_at),
          excluded.completed_at
        ),
        updated_at = now()
    `,
    [walletAddress, lessonId, score, completedAt],
  );
}

function toCompletionDay(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

async function persistVerifiedCompletionEvent(
  client,
  walletAddress,
  lessonId,
  lessonVersionId,
  lessonAttemptId,
  grading,
  completedAt,
) {
  const courseId = await getCourseIdForPublishedLesson(
    client,
    lessonId,
    lessonVersionId,
  );
  const completionDay = toCompletionDay(completedAt);
  const rewardUnits = grading.score > 0 ? 100 : 0;
  const payload = {
    eventType: 'verified_completion.accepted',
    walletAddress,
    courseId,
    lessonId,
    lessonVersionId,
    lessonAttemptId,
    completionDay,
    rewardUnits,
    score: grading.score,
    correctAnswers: grading.correctAnswers,
    totalQuestions: grading.totalQuestions,
    completedAt,
  };

  await client.query(
    `
      insert into lesson.verified_completion_events (
        event_id,
        wallet_address,
        course_id,
        lesson_id,
        lesson_version_id,
        lesson_attempt_id,
        completion_day,
        reward_units,
        score,
        correct_answers,
        total_questions,
        payload
      )
      values (
        $1::uuid,
        $2,
        $3,
        $4,
        $5::uuid,
        $6::uuid,
        $7::date,
        $8,
        $9,
        $10,
        $11,
        $12::jsonb
      )
      on conflict (event_id) do update set
        payload = excluded.payload,
        reward_units = excluded.reward_units,
        score = excluded.score,
        correct_answers = excluded.correct_answers,
        total_questions = excluded.total_questions
    `,
    [
      lessonAttemptId,
      walletAddress,
      courseId,
      lessonId,
      lessonVersionId,
      lessonAttemptId,
      completionDay,
      rewardUnits,
      grading.score,
      grading.correctAnswers,
      grading.totalQuestions,
      JSON.stringify(payload),
    ],
  );

  return {
    eventId: lessonAttemptId,
    courseId,
    completionDay,
    rewardUnits,
  };
}

async function readVerifiedCompletionEvent(client, lessonAttemptId) {
  const result = await client.query(
    `
      select
        event_id::text as "eventId",
        course_id as "courseId",
        completion_day::text as "completionDay",
        reward_units as "rewardUnits"
      from lesson.verified_completion_events
      where lesson_attempt_id = $1::uuid
      limit 1
    `,
    [lessonAttemptId],
  );

  return result.rows[0] ?? null;
}

async function claimVerifiedCompletionEvent(eventId = null, retryFailed = false) {
  const claimableStatuses = retryFailed ? ['pending', 'failed'] : ['pending'];
  const selectionArgs = [claimableStatuses];
  let result;

  if (eventId) {
    selectionArgs.push(eventId);
    result = await query(
      `
        update lesson.verified_completion_events
        set status = 'publishing',
            last_error = null
        where event_id = $2::uuid
          and status = any($1::text[])
        returning
          event_id::text as "eventId",
          wallet_address as "walletAddress",
          course_id as "courseId",
          completion_day::text as "completionDay",
          reward_units as "rewardUnits",
          payload->>'completedAt' as "completedAt",
          status
      `,
      selectionArgs,
    );
  } else {
    result = await query(
      `
        with next_event as (
          select event_id
          from lesson.verified_completion_events
          where status = any($1::text[])
          order by created_at asc
          for update skip locked
          limit 1
        )
        update lesson.verified_completion_events events
        set status = 'publishing',
            last_error = null
        from next_event
        where events.event_id = next_event.event_id
        returning
          events.event_id::text as "eventId",
          events.wallet_address as "walletAddress",
          events.course_id as "courseId",
          events.completion_day::text as "completionDay",
          events.reward_units as "rewardUnits",
          events.payload->>'completedAt' as "completedAt",
          events.status
      `,
      selectionArgs,
    );
  }

  if (result.rowCount > 0) {
    return {
      event: result.rows[0],
      reason: 'CLAIMED',
    };
  }

  if (!eventId) {
    return {
      event: null,
      reason: 'NO_PENDING_EVENT',
    };
  }

  const current = await query(
    `
      select
        event_id::text as "eventId",
        status,
        payload->>'completedAt' as "completedAt",
        last_error as "lastError",
        published_at as "publishedAt",
        transaction_signature as "transactionSignature"
      from lesson.verified_completion_events
      where event_id = $1::uuid
      limit 1
    `,
    [eventId],
  );

  if (current.rowCount === 0) {
    return {
      event: null,
      reason: 'EVENT_NOT_FOUND',
    };
  }

  const existing = current.rows[0];
  if (existing.status === 'published') {
    return {
      event: existing,
      reason: 'ALREADY_PUBLISHED',
    };
  }

  if (existing.status === 'publishing') {
    return {
      event: existing,
      reason: 'ALREADY_PUBLISHING',
    };
  }

  return {
    event: existing,
    reason: 'RETRY_REQUIRED',
  };
}

async function markVerifiedCompletionEventPublished(eventId, signature) {
  await query(
    `
      update lesson.verified_completion_events
      set status = 'published',
          published_at = now(),
          last_error = null,
          transaction_signature = $2
      where event_id = $1::uuid
    `,
    [eventId, signature],
  );
}

async function markVerifiedCompletionEventFailed(eventId, error) {
  await query(
    `
      update lesson.verified_completion_events
      set status = 'failed',
          last_error = $2
      where event_id = $1::uuid
    `,
    [eventId, error],
  );
}

function toUnixTimestampSeconds(value) {
  const milliseconds = new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) {
    throw badRequest('completedAt is invalid', 'INVALID_COMPLETED_AT');
  }

  return Math.floor(milliseconds / 1000);
}

export async function readCourseRuntimeState(client, walletAddress, courseId) {
  const state = await ensureCourseRuntimeState(client, walletAddress, courseId);
  const referenceDay =
    state.lastFuelCreditDay ??
    state.lastCompletedDay ??
    new Date().toISOString().slice(0, 10);

  return {
    courseId,
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    gauntletActive: state.gauntletActive,
    gauntletDay: state.gauntletDay,
    saverCount: state.saverCount,
    saverRecoveryMode: state.saverRecoveryMode,
    currentYieldRedirectBps: state.currentYieldRedirectBps,
    extensionDays: state.extensionDays,
    fuelCounter: state.fuelCounter,
    fuelCap: state.fuelCap,
    lastFuelCreditDay: state.lastFuelCreditDay,
    lastBrewerBurnTs: state.lastBrewerBurnTs,
    fuelAwarded: 0,
    fuelEarnStatus: deriveFuelEarnStatus(state, referenceDay),
  };
}

export async function syncCourseRuntimeStateWithLockSnapshot(
  walletAddress,
  courseId,
  lockSnapshot = null,
) {
  if (!hasDatabase()) {
    return null;
  }

  const snapshot = lockSnapshot ?? (await readLockAccountSnapshot(walletAddress, courseId));
  const extensionDays = Math.floor(snapshot.extensionSecondsTotal / 86_400);
  const saverCount = snapshot.gauntletComplete ? Math.max(0, 3 - snapshot.saversRemaining) : 0;

  return withTransactionAsWallet(walletAddress, async (client) => {
    await ensureCourseRuntimeState(client, walletAddress, courseId);
    await client.query(
      `
        update lesson.user_course_runtime_state
        set current_streak = $3,
            longest_streak = $4,
            gauntlet_active = $5,
            gauntlet_day = $6,
            saver_count = $7,
            saver_recovery_mode = $8,
            current_yield_redirect_bps = $9,
            extension_days = $10,
            fuel_counter = $11,
            fuel_cap = $12,
            last_completed_day = $13::date,
            last_fuel_credit_day = $14::date,
            last_brewer_burn_ts = $15::timestamptz,
            updated_at = now()
        where wallet_address = $1
          and course_id = $2
      `,
      [
        walletAddress,
        courseId,
        snapshot.currentStreak,
        snapshot.longestStreak,
        !snapshot.gauntletComplete,
        snapshot.gauntletDay,
        saverCount,
        snapshot.saverRecoveryMode,
        snapshot.currentYieldRedirectBps,
        extensionDays,
        snapshot.fuelCounter,
        snapshot.fuelCap,
        epochDayToIsoDate(snapshot.lastCompletionDay),
        epochDayToIsoDate(snapshot.lastFuelCreditDay),
        unixTimestampSecondsToIso(snapshot.lastBrewerBurnTs),
      ],
    );

    return readCourseRuntimeState(client, walletAddress, courseId);
  });
}

export async function listRuntimeSchedulerCandidates(limit = 10) {
  if (!hasDatabase()) {
    return [];
  }

  const result = await query(
    `
      select
        wallet_address as "walletAddress",
        course_id as "courseId",
        current_streak as "currentStreak",
        gauntlet_active as "gauntletActive",
        fuel_counter as "fuelCounter",
        last_completed_day::text as "lastCompletedDay",
        last_miss_day::text as "lastMissDay",
        last_brewer_burn_ts as "lastBrewerBurnTs",
        updated_at as "updatedAt"
      from lesson.user_course_runtime_state
      order by updated_at asc
      limit $1
    `,
    [limit],
  );

  return result.rows;
}

export async function getCourseRuntimeSnapshot(walletAddress, courseId) {
  if (!hasDatabase()) {
    return {
      courseId,
      currentStreak: 0,
      longestStreak: 0,
      gauntletActive: true,
      gauntletDay: 1,
      saverCount: 0,
      saverRecoveryMode: false,
      currentYieldRedirectBps: 0,
      extensionDays: 0,
      fuelCounter: 0,
      fuelCap: DEFAULT_FUEL_CAP,
      lastFuelCreditDay: null,
      lastBrewerBurnTs: null,
      fuelAwarded: 0,
      fuelEarnStatus: 'AVAILABLE',
    };
  }

  return withTransactionAsWallet(walletAddress, async (client) =>
    readCourseRuntimeState(client, walletAddress, courseId),
  );
}

export async function publishVerifiedCompletionEvent(
  eventId = null,
  retryFailed = false,
) {
  if (!hasDatabase()) {
    return {
      processed: false,
      reason: 'NO_DATABASE',
    };
  }

  if (!hasLockVaultRelayConfig()) {
    return {
      processed: false,
      reason: 'LOCK_VAULT_RELAY_DISABLED',
    };
  }

  const claim = await claimVerifiedCompletionEvent(eventId, retryFailed);
  if (!claim.event) {
    return {
      processed: false,
      reason: claim.reason,
    };
  }

  if (claim.reason !== 'CLAIMED') {
    return {
      processed: false,
      reason: claim.reason,
      event: claim.event,
    };
  }

  try {
    const lockTiming = await readLockAccountTiming(
      claim.event.walletAddress,
      claim.event.courseId,
    );
    const completedAtTs = toUnixTimestampSeconds(claim.event.completedAt);

    if (completedAtTs < lockTiming.lockStartTs) {
      const error =
        'Completion predates the on-chain lock start and cannot be published.';
      await markVerifiedCompletionEventFailed(claim.event.eventId, error);
      return {
        processed: false,
        reason: 'PREDATES_LOCK',
        eventId: claim.event.eventId,
        courseId: claim.event.courseId,
        walletAddress: claim.event.walletAddress,
        error,
        lockAccount: lockTiming.lockAccount,
      };
    }

    const publishResult = await publishVerifiedCompletionToLockVault(claim.event);
    await markVerifiedCompletionEventPublished(
      claim.event.eventId,
      publishResult.signature,
    );

    return {
      processed: true,
      reason: 'PUBLISHED',
      eventId: claim.event.eventId,
      courseId: claim.event.courseId,
      walletAddress: claim.event.walletAddress,
      completionDay: claim.event.completionDay,
      rewardUnits: claim.event.rewardUnits,
      signature: publishResult.signature,
      authority: publishResult.authority,
      lockAccount: publishResult.lockAccount,
      receiptAccount: publishResult.receiptAccount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markVerifiedCompletionEventFailed(claim.event.eventId, message);

    return {
      processed: false,
      reason: 'PUBLISH_FAILED',
      eventId: claim.event.eventId,
      courseId: claim.event.courseId,
      walletAddress: claim.event.walletAddress,
      error: message,
    };
  }
}

export async function publishFuelBurnReceipt(
  walletAddress,
  courseId,
  cycleId,
  retryFailed = false,
) {
  if (!hasDatabase()) {
    return {
      processed: false,
      reason: 'NO_DATABASE',
    };
  }

  if (!hasLockVaultRelayConfig()) {
    return {
      processed: false,
      reason: 'LOCK_VAULT_RELAY_DISABLED',
    };
  }

  const claim = await claimFuelBurnReceipt(
    walletAddress,
    courseId,
    cycleId,
    retryFailed,
  );
  if (!claim.receipt) {
    return {
      processed: false,
      reason: claim.reason,
    };
  }

  if (claim.reason !== 'CLAIMED') {
    return {
      processed: false,
      reason: claim.reason,
      receipt: claim.receipt,
    };
  }

  if (!['BURNED', 'GAUNTLET_LOCKED', 'NO_FUEL'].includes(claim.receipt.reason ?? '')) {
    const error = `Fuel burn receipt reason is not publishable: ${claim.receipt.reason ?? 'UNKNOWN'}`;
    await markFuelBurnReceiptFailed(walletAddress, courseId, cycleId, error);
    return {
      processed: false,
      reason: 'UNPUBLISHABLE_RECEIPT',
      walletAddress,
      courseId,
      cycleId,
      error,
    };
  }

  try {
    const publishResult = await publishFuelBurnToLockVault(claim.receipt);
    await markFuelBurnReceiptPublished(
      walletAddress,
      courseId,
      cycleId,
      publishResult.signature,
    );

    return {
      processed: true,
      reason: 'PUBLISHED',
      walletAddress,
      courseId,
      cycleId,
      burnedAt: claim.receipt.burnedAt,
      signature: publishResult.signature,
      authority: publishResult.authority,
      lockAccount: publishResult.lockAccount,
      receiptAccount: publishResult.receiptAccount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markFuelBurnReceiptFailed(walletAddress, courseId, cycleId, message);

    return {
      processed: false,
      reason: 'PUBLISH_FAILED',
      walletAddress,
      courseId,
      cycleId,
      error: message,
    };
  }
}

export async function publishMissConsequenceReceipt(
  walletAddress,
  courseId,
  missEventId,
  retryFailed = false,
) {
  if (!hasDatabase()) {
    return {
      processed: false,
      reason: 'NO_DATABASE',
    };
  }

  if (!hasLockVaultRelayConfig()) {
    return {
      processed: false,
      reason: 'LOCK_VAULT_RELAY_DISABLED',
    };
  }

  const claim = await claimMissConsequenceReceipt(
    walletAddress,
    courseId,
    missEventId,
    retryFailed,
  );
  if (!claim.receipt) {
    return {
      processed: false,
      reason: claim.reason,
    };
  }

  if (claim.reason !== 'CLAIMED') {
    return {
      processed: false,
      reason: claim.reason,
      receipt: claim.receipt,
    };
  }

  if (!['SAVER_CONSUMED', 'FULL_CONSEQUENCE', 'GAUNTLET_LOCKED'].includes(claim.receipt.reason ?? '')) {
    const error =
      `Miss consequence receipt reason is not publishable: ${claim.receipt.reason ?? 'UNKNOWN'}`;
    await markMissConsequenceReceiptFailed(walletAddress, courseId, missEventId, error);
    return {
      processed: false,
      reason: 'UNPUBLISHABLE_RECEIPT',
      walletAddress,
      courseId,
      missEventId,
      error,
    };
  }

  try {
    const publishResult = await publishMissConsequenceToLockVault(claim.receipt);
    await markMissConsequenceReceiptPublished(
      walletAddress,
      courseId,
      missEventId,
      publishResult.signature,
    );

    return {
      processed: true,
      reason: 'PUBLISHED',
      walletAddress,
      courseId,
      missEventId,
      missDay: claim.receipt.missDay,
      signature: publishResult.signature,
      authority: publishResult.authority,
      lockAccount: publishResult.lockAccount,
      receiptAccount: publishResult.receiptAccount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markMissConsequenceReceiptFailed(
      walletAddress,
      courseId,
      missEventId,
      message,
    );

    return {
      processed: false,
      reason: 'PUBLISH_FAILED',
      walletAddress,
      courseId,
      missEventId,
      error: message,
    };
  }
}

async function readHarvestResultReceipt(client, walletAddress, courseId, harvestId) {
  const result = await client.query(
    `
      select
        wallet_address as "walletAddress",
        course_id as "courseId",
        harvest_id as "harvestId",
        harvested_at as "harvestedAt",
        gross_yield_amount as "grossYieldAmount",
        applied,
        reason,
        platform_fee_amount as "platformFeeAmount",
        redirected_amount as "redirectedAmount",
        ichor_awarded as "ichorAwarded",
        lock_vault_status as "lockVaultStatus",
        lock_vault_published_at as "lockVaultPublishedAt",
        lock_vault_last_error as "lockVaultLastError",
        lock_vault_transaction_signature as "lockVaultTransactionSignature"
      from lesson.harvest_result_receipts
      where wallet_address = $1
        and course_id = $2
        and harvest_id = $3
      limit 1
    `,
    [walletAddress, courseId, harvestId],
  );

  return result.rows[0] ?? null;
}

export async function recordHarvestResult(
  walletAddress,
  courseId,
  harvestId,
  grossYieldAmount,
  harvestedAt = null,
) {
  if (!harvestId || typeof harvestId !== 'string') {
    throw badRequest('harvestId is required', 'MISSING_HARVEST_ID');
  }

  const amount =
    typeof grossYieldAmount === 'string' || typeof grossYieldAmount === 'number'
      ? BigInt(grossYieldAmount)
      : null;
  if (amount == null || amount < 0n) {
    throw badRequest('grossYieldAmount must be a non-negative integer', 'INVALID_GROSS_YIELD');
  }

  const harvestedAtValue = harvestedAt ?? new Date().toISOString();

  if (!hasDatabase()) {
    return {
      harvestId,
      harvestedAt: harvestedAtValue,
      grossYieldAmount: amount.toString(),
      lockVaultStatus: 'pending',
    };
  }

  return withTransactionAsWallet(walletAddress, async (client) => {
    const existingReceipt = await readHarvestResultReceipt(
      client,
      walletAddress,
      courseId,
      harvestId,
    );

    if (existingReceipt) {
      return existingReceipt;
    }

    await client.query(
      `
        insert into lesson.harvest_result_receipts (
          wallet_address,
          course_id,
          harvest_id,
          harvested_at,
          gross_yield_amount
        )
        values ($1, $2, $3, $4::timestamptz, $5::bigint)
      `,
      [walletAddress, courseId, harvestId, harvestedAtValue, amount.toString()],
    );

    return readHarvestResultReceipt(client, walletAddress, courseId, harvestId);
  });
}

async function claimHarvestResultReceipt(
  walletAddress,
  courseId,
  harvestId,
  retryFailed = false,
) {
  const claimableStatuses = retryFailed ? ['pending', 'failed'] : ['pending'];
  const result = await query(
    `
      update lesson.harvest_result_receipts
      set lock_vault_status = 'publishing',
          lock_vault_last_error = null
      where wallet_address = $1
        and course_id = $2
        and harvest_id = $3
        and lock_vault_status = any($4::text[])
      returning
        wallet_address as "walletAddress",
        course_id as "courseId",
        harvest_id as "harvestId",
        harvested_at as "harvestedAt",
        gross_yield_amount as "grossYieldAmount",
        applied,
        reason
    `,
    [walletAddress, courseId, harvestId, claimableStatuses],
  );

  if (result.rowCount > 0) {
    return { receipt: result.rows[0], reason: 'CLAIMED' };
  }

  const current = await query(
    `
      select
        wallet_address as "walletAddress",
        course_id as "courseId",
        harvest_id as "harvestId",
        harvested_at as "harvestedAt",
        gross_yield_amount as "grossYieldAmount",
        applied,
        reason,
        lock_vault_status as "lockVaultStatus",
        lock_vault_published_at as "lockVaultPublishedAt",
        lock_vault_last_error as "lockVaultLastError",
        lock_vault_transaction_signature as "lockVaultTransactionSignature"
      from lesson.harvest_result_receipts
      where wallet_address = $1
        and course_id = $2
        and harvest_id = $3
      limit 1
    `,
    [walletAddress, courseId, harvestId],
  );

  if (current.rowCount === 0) {
    return { receipt: null, reason: 'RECEIPT_NOT_FOUND' };
  }

  const existing = current.rows[0];
  if (existing.lockVaultStatus === 'published') {
    return { receipt: existing, reason: 'ALREADY_PUBLISHED' };
  }

  if (existing.lockVaultStatus === 'publishing') {
    return { receipt: existing, reason: 'ALREADY_PUBLISHING' };
  }

  return { receipt: existing, reason: 'RETRY_REQUIRED' };
}

async function markHarvestResultReceiptPublished(
  walletAddress,
  courseId,
  harvestId,
  values,
) {
  await query(
    `
      update lesson.harvest_result_receipts
      set lock_vault_status = 'published',
          lock_vault_published_at = now(),
          lock_vault_last_error = null,
          lock_vault_transaction_signature = $4,
          applied = $5,
          reason = $6,
          platform_fee_amount = $7::bigint,
          redirected_amount = $8::bigint,
          ichor_awarded = $9::bigint
      where wallet_address = $1
        and course_id = $2
        and harvest_id = $3
    `,
    [
      walletAddress,
      courseId,
      harvestId,
      values.signature,
      values.applied,
      values.reason,
      values.platformFeeAmount,
      values.redirectedAmount,
      values.ichorAwarded,
    ],
  );
}

async function markHarvestResultReceiptFailed(walletAddress, courseId, harvestId, error) {
  await query(
    `
      update lesson.harvest_result_receipts
      set lock_vault_status = 'failed',
          lock_vault_last_error = $4
      where wallet_address = $1
        and course_id = $2
        and harvest_id = $3
    `,
    [walletAddress, courseId, harvestId, error],
  );
}

export async function publishHarvestResultReceipt(
  walletAddress,
  courseId,
  harvestId,
  retryFailed = false,
) {
  if (!hasDatabase()) {
    return {
      processed: false,
      reason: 'NO_DATABASE',
    };
  }

  if (!hasLockVaultRelayConfig()) {
    return {
      processed: false,
      reason: 'LOCK_VAULT_RELAY_DISABLED',
    };
  }

  const claim = await claimHarvestResultReceipt(
    walletAddress,
    courseId,
    harvestId,
    retryFailed,
  );
  if (!claim.receipt) {
    return {
      processed: false,
      reason: claim.reason,
    };
  }

  if (claim.reason !== 'CLAIMED') {
    return {
      processed: false,
      reason: claim.reason,
      receipt: claim.receipt,
    };
  }

  try {
    const snapshotBefore = await readLockAccountSnapshot(walletAddress, courseId);
    const grossYieldAmount = BigInt(claim.receipt.grossYieldAmount);
    const publishResult = await publishHarvestToLockVault({
      walletAddress,
      courseId,
      harvestId,
      grossYieldAmount: claim.receipt.grossYieldAmount,
    });
    const snapshotAfter = await readLockAccountSnapshot(walletAddress, courseId);

    const applied =
      snapshotAfter.ichorCounter > snapshotBefore.ichorCounter ||
      snapshotAfter.ichorLifetimeTotal > snapshotBefore.ichorLifetimeTotal;
    const platformFeeAmount = percentageOfAmountAtomic(grossYieldAmount, 1_000).toString();
    const redirectedAmount = percentageOfAmountAtomic(
      grossYieldAmount,
      snapshotBefore.currentYieldRedirectBps,
    ).toString();
    const userShare =
      grossYieldAmount - BigInt(platformFeeAmount) - BigInt(redirectedAmount);
    const ichorAwarded = applied
      ? (
          percentageOfAmountAtomic(
            userShare > 0n ? userShare : 0n,
            getSkrMultiplierBps(snapshotBefore.skrTier),
          )
        ).toString()
      : '0';
    const reason = applied ? 'HARVEST_APPLIED' : 'HARVEST_SKIPPED';

    await markHarvestResultReceiptPublished(walletAddress, courseId, harvestId, {
      signature: publishResult.signature,
      applied,
      reason,
      platformFeeAmount,
      redirectedAmount,
      ichorAwarded,
    });
    await syncCourseRuntimeStateWithLockSnapshot(walletAddress, courseId, snapshotAfter);

    return {
      processed: true,
      reason: 'PUBLISHED',
      walletAddress,
      courseId,
      harvestId,
      grossYieldAmount: claim.receipt.grossYieldAmount,
      applied,
      harvestReason: reason,
      platformFeeAmount,
      redirectedAmount,
      ichorAwarded,
      signature: publishResult.signature,
      authority: publishResult.authority,
      lockAccount: publishResult.lockAccount,
      receiptAccount: publishResult.receiptAccount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markHarvestResultReceiptFailed(walletAddress, courseId, harvestId, message);

    return {
      processed: false,
      reason: 'PUBLISH_FAILED',
      walletAddress,
      courseId,
      harvestId,
      error: message,
    };
  }
}

async function readFuelBurnReceipt(client, walletAddress, courseId, cycleId) {
  const result = await client.query(
    `
      select
        wallet_address as "walletAddress",
        course_id as "courseId",
        cycle_id as "cycleId",
        burned_at as "burnedAt",
        applied,
        fuel_before as "fuelBefore",
        fuel_after as "fuelAfter",
        reason,
        lock_vault_status as "lockVaultStatus",
        lock_vault_published_at as "lockVaultPublishedAt",
        lock_vault_last_error as "lockVaultLastError",
        lock_vault_transaction_signature as "lockVaultTransactionSignature"
      from lesson.fuel_burn_cycle_receipts
      where wallet_address = $1
        and course_id = $2
        and cycle_id = $3
      limit 1
    `,
    [walletAddress, courseId, cycleId],
  );

  return result.rows[0] ?? null;
}

async function claimFuelBurnReceipt(walletAddress, courseId, cycleId, retryFailed = false) {
  const claimableStatuses = retryFailed ? ['pending', 'failed'] : ['pending'];
  const result = await query(
    `
      update lesson.fuel_burn_cycle_receipts
      set lock_vault_status = 'publishing',
          lock_vault_last_error = null
      where wallet_address = $1
        and course_id = $2
        and cycle_id = $3
        and lock_vault_status = any($4::text[])
      returning
        wallet_address as "walletAddress",
        course_id as "courseId",
        cycle_id as "cycleId",
        burned_at as "burnedAt",
        applied,
        reason
    `,
    [walletAddress, courseId, cycleId, claimableStatuses],
  );

  if (result.rowCount > 0) {
    return { receipt: result.rows[0], reason: 'CLAIMED' };
  }

  const current = await query(
    `
      select
        wallet_address as "walletAddress",
        course_id as "courseId",
        cycle_id as "cycleId",
        burned_at as "burnedAt",
        applied,
        reason,
        lock_vault_status as "lockVaultStatus",
        lock_vault_published_at as "lockVaultPublishedAt",
        lock_vault_last_error as "lockVaultLastError",
        lock_vault_transaction_signature as "lockVaultTransactionSignature"
      from lesson.fuel_burn_cycle_receipts
      where wallet_address = $1
        and course_id = $2
        and cycle_id = $3
      limit 1
    `,
    [walletAddress, courseId, cycleId],
  );

  if (current.rowCount === 0) {
    return { receipt: null, reason: 'RECEIPT_NOT_FOUND' };
  }

  const existing = current.rows[0];
  if (existing.lockVaultStatus === 'published') {
    return { receipt: existing, reason: 'ALREADY_PUBLISHED' };
  }

  if (existing.lockVaultStatus === 'publishing') {
    return { receipt: existing, reason: 'ALREADY_PUBLISHING' };
  }

  return { receipt: existing, reason: 'RETRY_REQUIRED' };
}

async function markFuelBurnReceiptPublished(walletAddress, courseId, cycleId, signature) {
  await query(
    `
      update lesson.fuel_burn_cycle_receipts
      set lock_vault_status = 'published',
          lock_vault_published_at = now(),
          lock_vault_last_error = null,
          lock_vault_transaction_signature = $4
      where wallet_address = $1
        and course_id = $2
        and cycle_id = $3
    `,
    [walletAddress, courseId, cycleId, signature],
  );
}

async function markFuelBurnReceiptFailed(walletAddress, courseId, cycleId, error) {
  await query(
    `
      update lesson.fuel_burn_cycle_receipts
      set lock_vault_status = 'failed',
          lock_vault_last_error = $4
      where wallet_address = $1
        and course_id = $2
        and cycle_id = $3
    `,
    [walletAddress, courseId, cycleId, error],
  );
}

async function readMissConsequenceReceipt(client, walletAddress, courseId, missEventId) {
  const result = await client.query(
    `
      select
        wallet_address as "walletAddress",
        course_id as "courseId",
        miss_event_id as "missEventId",
        miss_day::text as "missDay",
        applied,
        reason,
        saver_count_before as "saverCountBefore",
        saver_count_after as "saverCountAfter",
        redirect_bps_before as "redirectBpsBefore",
        redirect_bps_after as "redirectBpsAfter",
        extension_days_before as "extensionDaysBefore",
        extension_days_after as "extensionDaysAfter",
        lock_vault_status as "lockVaultStatus",
        lock_vault_published_at as "lockVaultPublishedAt",
        lock_vault_last_error as "lockVaultLastError",
        lock_vault_transaction_signature as "lockVaultTransactionSignature"
      from lesson.miss_consequence_receipts
      where wallet_address = $1
        and course_id = $2
        and miss_event_id = $3
      limit 1
    `,
    [walletAddress, courseId, missEventId],
  );

  return result.rows[0] ?? null;
}

async function claimMissConsequenceReceipt(
  walletAddress,
  courseId,
  missEventId,
  retryFailed = false,
) {
  const claimableStatuses = retryFailed ? ['pending', 'failed'] : ['pending'];
  const result = await query(
    `
      update lesson.miss_consequence_receipts
      set lock_vault_status = 'publishing',
          lock_vault_last_error = null
      where wallet_address = $1
        and course_id = $2
        and miss_event_id = $3
        and lock_vault_status = any($4::text[])
      returning
        wallet_address as "walletAddress",
        course_id as "courseId",
        miss_event_id as "missEventId",
        miss_day::text as "missDay",
        applied,
        reason
    `,
    [walletAddress, courseId, missEventId, claimableStatuses],
  );

  if (result.rowCount > 0) {
    return { receipt: result.rows[0], reason: 'CLAIMED' };
  }

  const current = await query(
    `
      select
        wallet_address as "walletAddress",
        course_id as "courseId",
        miss_event_id as "missEventId",
        miss_day::text as "missDay",
        applied,
        reason,
        lock_vault_status as "lockVaultStatus",
        lock_vault_published_at as "lockVaultPublishedAt",
        lock_vault_last_error as "lockVaultLastError",
        lock_vault_transaction_signature as "lockVaultTransactionSignature"
      from lesson.miss_consequence_receipts
      where wallet_address = $1
        and course_id = $2
        and miss_event_id = $3
      limit 1
    `,
    [walletAddress, courseId, missEventId],
  );

  if (current.rowCount === 0) {
    return { receipt: null, reason: 'RECEIPT_NOT_FOUND' };
  }

  const existing = current.rows[0];
  if (existing.lockVaultStatus === 'published') {
    return { receipt: existing, reason: 'ALREADY_PUBLISHED' };
  }

  if (existing.lockVaultStatus === 'publishing') {
    return { receipt: existing, reason: 'ALREADY_PUBLISHING' };
  }

  return { receipt: existing, reason: 'RETRY_REQUIRED' };
}

async function markMissConsequenceReceiptPublished(
  walletAddress,
  courseId,
  missEventId,
  signature,
) {
  await query(
    `
      update lesson.miss_consequence_receipts
      set lock_vault_status = 'published',
          lock_vault_published_at = now(),
          lock_vault_last_error = null,
          lock_vault_transaction_signature = $4
      where wallet_address = $1
        and course_id = $2
        and miss_event_id = $3
    `,
    [walletAddress, courseId, missEventId, signature],
  );
}

async function markMissConsequenceReceiptFailed(walletAddress, courseId, missEventId, error) {
  await query(
    `
      update lesson.miss_consequence_receipts
      set lock_vault_status = 'failed',
          lock_vault_last_error = $4
      where wallet_address = $1
        and course_id = $2
        and miss_event_id = $3
    `,
    [walletAddress, courseId, missEventId, error],
  );
}

export async function consumeSaverOrApplyFullConsequence(
  walletAddress,
  courseId,
  missEventId,
  missDay = null,
) {
  if (!missEventId || typeof missEventId !== 'string') {
    throw badRequest('missEventId is required', 'MISSING_MISS_EVENT_ID');
  }

  const missDayValue = missDay ?? new Date().toISOString().slice(0, 10);

  if (!hasDatabase()) {
    return {
      missEventId,
      applied: false,
      reason: 'NO_DATABASE',
    };
  }

  return withTransactionAsWallet(walletAddress, async (client) => {
    const existingReceipt = await readMissConsequenceReceipt(
      client,
      walletAddress,
      courseId,
      missEventId,
    );

    if (existingReceipt) {
      const courseRuntime = await readCourseRuntimeState(client, walletAddress, courseId);
      return {
        missEventId,
        applied: existingReceipt.applied,
        reason: existingReceipt.reason,
        courseRuntime,
      };
    }

    const state = await ensureCourseRuntimeState(client, walletAddress, courseId);
    const saverCountBefore = state.saverCount;
    const redirectBpsBefore = state.currentYieldRedirectBps;
    const extensionDaysBefore = state.extensionDays;

    let applied = false;
    let reason = 'GAUNTLET_LOCKED';
    let saverCountAfter = saverCountBefore;
    let redirectBpsAfter = redirectBpsBefore;
    let extensionDaysAfter = extensionDaysBefore;
    let saverRecoveryMode = state.saverRecoveryMode;
    let currentStreak = state.currentStreak;

    if (!state.gauntletActive) {
      applied = true;
      currentStreak = 0;

      if (state.saverCount < 3) {
        saverCountAfter = state.saverCount + 1;
        redirectBpsAfter = getSaverRedirectBps(saverCountAfter);
        saverRecoveryMode = true;
        reason = 'SAVER_CONSUMED';
      } else {
        redirectBpsAfter = 10000;
        extensionDaysAfter = state.extensionDays + appConfig.missExtensionDays;
        saverRecoveryMode = true;
        reason = 'FULL_CONSEQUENCE';
      }

      await client.query(
        `
          update lesson.user_course_runtime_state
          set current_streak = $3,
              saver_count = $4,
              saver_recovery_mode = $5,
              current_yield_redirect_bps = $6,
              extension_days = $7,
              last_miss_day = $8::date,
              updated_at = now()
          where wallet_address = $1
            and course_id = $2
        `,
        [
          walletAddress,
          courseId,
          currentStreak,
          saverCountAfter,
          saverRecoveryMode,
          redirectBpsAfter,
          extensionDaysAfter,
          missDayValue,
        ],
      );
    }

    await client.query(
      `
        insert into lesson.miss_consequence_receipts (
          wallet_address,
          course_id,
          miss_event_id,
          miss_day,
          applied,
          reason,
          saver_count_before,
          saver_count_after,
          redirect_bps_before,
          redirect_bps_after,
          extension_days_before,
          extension_days_after
        )
        values (
          $1,
          $2,
          $3,
          $4::date,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12
        )
      `,
      [
        walletAddress,
        courseId,
        missEventId,
        missDayValue,
        applied,
        reason,
        saverCountBefore,
        saverCountAfter,
        redirectBpsBefore,
        redirectBpsAfter,
        extensionDaysBefore,
        extensionDaysAfter,
      ],
    );

    const courseRuntime = await readCourseRuntimeState(client, walletAddress, courseId);

    return {
      missEventId,
      applied,
      reason,
      courseRuntime,
    };
  });
}

export async function consumeDailyFuel(
  walletAddress,
  courseId,
  cycleId,
  burnedAt = null,
) {
  if (!cycleId || typeof cycleId !== 'string') {
    throw badRequest('cycleId is required', 'MISSING_CYCLE_ID');
  }

  const timestamp = burnedAt ?? new Date().toISOString();

  if (!hasDatabase()) {
    return {
      cycleId,
      applied: false,
      fuelBurned: 0,
      burnedAt: timestamp,
      reason: 'NO_DATABASE',
    };
  }

  return withTransactionAsWallet(walletAddress, async (client) => {
    const existingReceipt = await readFuelBurnReceipt(
      client,
      walletAddress,
      courseId,
      cycleId,
    );

    if (existingReceipt) {
      const courseRuntime = await readCourseRuntimeState(client, walletAddress, courseId);
      return {
        cycleId,
        applied: existingReceipt.applied,
        fuelBurned: existingReceipt.applied ? 1 : 0,
        burnedAt: existingReceipt.burnedAt,
        reason: existingReceipt.reason ?? 'ALREADY_PROCESSED',
        courseRuntime,
      };
    }

    const state = await ensureCourseRuntimeState(client, walletAddress, courseId);
    const burnedAtDate = new Date(timestamp);
    const lastBurnAt = state.lastBrewerBurnTs
      ? new Date(state.lastBrewerBurnTs)
      : null;
    const enoughTimeElapsed =
      !lastBurnAt ||
      burnedAtDate.getTime() - lastBurnAt.getTime() >= 24 * 60 * 60 * 1000;

    let applied = false;
    let fuelAfter = state.fuelCounter;
    let reason = 'NO_FUEL';

    if (state.gauntletActive) {
      reason = 'GAUNTLET_LOCKED';
    } else if (!enoughTimeElapsed) {
      reason = 'TOO_EARLY';
    } else if (state.fuelCounter > 0) {
      applied = true;
      fuelAfter = state.fuelCounter - 1;
      reason = 'BURNED';

      await client.query(
        `
          update lesson.user_course_runtime_state
          set fuel_counter = $3,
              last_brewer_burn_ts = $4::timestamptz,
              updated_at = now()
          where wallet_address = $1
            and course_id = $2
        `,
        [walletAddress, courseId, fuelAfter, timestamp],
      );
    }

    await client.query(
      `
        insert into lesson.fuel_burn_cycle_receipts (
          wallet_address,
          course_id,
          cycle_id,
          burned_at,
          applied,
          fuel_before,
          fuel_after,
          reason
        )
        values (
          $1,
          $2,
          $3,
          $4::timestamptz,
          $5,
          $6,
          $7,
          $8
        )
      `,
      [
        walletAddress,
        courseId,
        cycleId,
        timestamp,
        applied,
        state.fuelCounter,
        fuelAfter,
        reason,
      ],
    );

    const courseRuntime = await readCourseRuntimeState(client, walletAddress, courseId);

    return {
      cycleId,
      applied,
      fuelBurned: applied ? 1 : 0,
      burnedAt: timestamp,
      reason,
      courseRuntime,
    };
  });
}

export async function startLessonAttempt(
  walletAddress,
  lessonId,
  attemptId,
  startedAt = null,
) {
  const normalizedAttemptId = assertAttemptId(attemptId);
  const timestamp = startedAt ?? new Date().toISOString();

  if (!hasDatabase()) {
    return {
      lessonId,
      attemptId: normalizedAttemptId,
      startedAt: timestamp,
    };
  }

  return withTransactionAsWallet(walletAddress, async (client) => {
    const lessonVersion = await getPublishedLessonVersion(client, lessonId);
    const attempt = await ensureAttempt(
      client,
      walletAddress,
      lessonId,
      normalizedAttemptId,
      lessonVersion.lessonVersionId,
      timestamp,
    );

    return {
      lessonId,
      attemptId: attempt.attemptId,
      startedAt: attempt.startedAt,
    };
  });
}

export async function submitLessonAttempt(
  walletAddress,
  lessonId,
  attemptId,
  answers,
  startedAt = null,
  completedAt = null,
) {
  const normalizedAttemptId = assertAttemptId(attemptId);
  const submittedAnswers = assertAnswers(answers);
  const timestamp = completedAt ?? new Date().toISOString();

  if (!hasDatabase()) {
    const totalQuestions = submittedAnswers.size;
    return {
      lessonId,
      attemptId: normalizedAttemptId,
      accepted: true,
      score: 100,
      correctAnswers: totalQuestions,
      totalQuestions,
      completedAt: timestamp,
      completionEventId: normalizedAttemptId,
    };
  }

  return withTransactionAsWallet(walletAddress, async (client) => {
    const lessonVersion = await getPublishedLessonVersion(client, lessonId);
    const attempt = await ensureAttempt(
      client,
      walletAddress,
      lessonId,
      normalizedAttemptId,
      lessonVersion.lessonVersionId,
      startedAt,
    );

    if (attempt.submittedAt) {
      const questions = await listLessonQuestions(client, attempt.lessonVersionId);
      const totalQuestions = questions.length;
      const correctAnswers = Math.round(
        ((attempt.score ?? 0) / 100) * Math.max(totalQuestions, 0),
      );
      const completionEvent = await readVerifiedCompletionEvent(
        client,
        attempt.attemptId,
      );
      const courseId =
        completionEvent?.courseId ??
        (await getCourseIdForPublishedLesson(
          client,
          lessonId,
          attempt.lessonVersionId,
        ));
      const courseRuntime = await readCourseRuntimeState(
        client,
        walletAddress,
        courseId,
      );

      return {
        lessonId,
        attemptId: attempt.attemptId,
        accepted: attempt.accepted ?? true,
        score: attempt.score ?? 0,
        correctAnswers,
        totalQuestions,
        completedAt: attempt.submittedAt,
        completionEventId: completionEvent?.eventId ?? attempt.attemptId,
        courseRuntime,
      };
    }

    const questions = await listLessonQuestions(client, attempt.lessonVersionId);
    const grading = gradeAnswers(questions, submittedAnswers);

    await persistQuestionAttempts(client, normalizedAttemptId, grading.attempts);

    await client.query(
      `
        update lesson.user_lesson_attempts
        set submitted_at = $2::timestamptz,
            score = $3,
            accepted = true
        where id = $1::uuid
      `,
      [normalizedAttemptId, timestamp, grading.score],
    );

    await persistLessonProgress(
      client,
      walletAddress,
      lessonId,
      grading.score,
      timestamp,
    );

    const completionEvent = await persistVerifiedCompletionEvent(
      client,
      walletAddress,
      lessonId,
      attempt.lessonVersionId,
      normalizedAttemptId,
      grading,
      timestamp,
    );
    const courseRuntime = await applyVerifiedCompletionToCourseRuntime(
      client,
      walletAddress,
      completionEvent.courseId,
      completionEvent.completionDay,
      completionEvent.rewardUnits,
    );

    return {
      lessonId,
      attemptId: normalizedAttemptId,
      accepted: true,
      score: grading.score,
      correctAnswers: grading.correctAnswers,
      totalQuestions: grading.totalQuestions,
      completedAt: timestamp,
      completionEventId: completionEvent.eventId,
      courseRuntime,
    };
  });
}

export async function getCourseProgress(walletAddress, courseId) {
  if (!hasDatabase()) {
    return {
      courseId,
      completedLessons: 0,
      totalLessons: 0,
      completionRate: 0,
    };
  }

  const result = await queryAsWallet(
    walletAddress,
    `
      with totals as (
        select count(*)::int as total_lessons
        from lesson.course_modules cm
        join lesson.module_lessons ml on ml.module_id = cm.module_id
        where cm.course_id = $2
      ),
      completed as (
        select count(*)::int as completed_lessons
        from lesson.user_lesson_progress ulp
        join lesson.module_lessons ml on ml.lesson_id = ulp.lesson_id
        join lesson.course_modules cm on cm.module_id = ml.module_id
        where ulp.wallet_address = $1
          and cm.course_id = $2
          and ulp.completed = true
      )
      select
        $2::text as "courseId",
        completed.completed_lessons as "completedLessons",
        totals.total_lessons as "totalLessons",
        case
          when totals.total_lessons = 0 then 0
          else round((completed.completed_lessons::numeric / totals.total_lessons::numeric), 4)
        end as "completionRate"
      from totals, completed
    `,
    [walletAddress, courseId],
  );

  return result.rows[0];
}

export async function getModuleProgress(walletAddress, moduleId) {
  if (!hasDatabase()) {
    return {
      moduleId,
      completedLessons: 0,
      totalLessons: 0,
      completionRate: 0,
    };
  }

  const result = await queryAsWallet(
    walletAddress,
    `
      with totals as (
        select count(*)::int as total_lessons
        from lesson.module_lessons ml
        where ml.module_id = $2
      ),
      completed as (
        select count(*)::int as completed_lessons
        from lesson.user_lesson_progress ulp
        join lesson.module_lessons ml on ml.lesson_id = ulp.lesson_id
        where ulp.wallet_address = $1
          and ml.module_id = $2
          and ulp.completed = true
      )
      select
        $2::text as "moduleId",
        completed.completed_lessons as "completedLessons",
        totals.total_lessons as "totalLessons",
        case
          when totals.total_lessons = 0 then 0
          else round((completed.completed_lessons::numeric / totals.total_lessons::numeric), 4)
        end as "completionRate"
      from totals, completed
    `,
    [walletAddress, moduleId],
  );

  return result.rows[0];
}
