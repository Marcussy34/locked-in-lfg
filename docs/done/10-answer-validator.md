# Done: 10 Subjective Answer Validator

## Scope Completed

This checkpoint added the first real rubric-first validator for `short_text` lesson questions.
It stays fully off-chain and feeds the same verified completion event pipeline used by objective questions.
It now also supports optional hybrid feedback enrichment through OpenAI Responses.

## What Was Implemented

### Deterministic rubric evaluator

- Backend now reads `lesson.questions.metadata` for subjective rubric config.
- Supported deterministic criterion kinds:
  - `keywords`
  - `exact`
- The validator computes:
  - `accepted`
  - `score`
  - `criteriaBreakdown`
  - `feedbackSummary`
  - `validatorVersion`
  - `decisionHash`

### Audit trail

- Added `lesson.answer_validation_decisions`.
- Each subjective decision now stores:
  - prompt snapshot
  - learner answer
  - rubric snapshot
  - criteria breakdown
  - integrity flags
  - feedback summary
  - decision hash

### Progress-pipeline integration

- Accepted subjective submits now behave like objective verified completions.
- Rejected subjective submits do not create completion events and do not advance course runtime.
- Lesson-level acceptance now uses a threshold gate instead of blindly accepting every submit.

### App feedback

- `LessonResult` can now show backend subjective feedback for short-text questions.
- This gives the user:
  - what was correct
  - what concept was missing
  - how to improve next attempt

### Optional hybrid feedback

- Hybrid mode is controlled by backend env flags.
- Rubric scoring still decides:
  - `accepted`
  - `score`
  - completion eligibility
- When enabled, OpenAI Responses can rewrite only the `feedbackSummary`.
- If the model call fails, times out, or is disabled, the validator falls back to rubric-only feedback.

### Dev content for testing

- Added a fresh published dev release with subjective lesson `sf-2`.
- `sf-2` asks: `What does PDA stand for on Solana?`
- It uses a 3-part rubric:
  - Program
  - Derived
  - Address

## Main Files

- `backend/sql/0014_answer_validation_decisions.sql`
- `backend/sql/0015_seed_subjective_dev_release.sql`
- `backend/src/config.mjs`
- `backend/src/lib/answerValidator.mjs`
- `backend/src/modules/progress/repository.mjs`
- `backend/openapi/lesson-api-v1.yaml`
- `src/services/api/types.ts`
- `src/screens/main/LessonScreen.tsx`
- `src/screens/main/LessonResultScreen.tsx`

## Verified Outcomes

- Public content now serves `sf-2` as a live `short_text` lesson.
- Direct backend verification confirmed:
  - `Program Derived Address` -> accepted, `score = 100`
  - `Private Data Account` -> rejected, `score = 0`
- Subjective decisions now return feedback summaries and decision hashes.
- Hybrid-path verification confirmed:
  - enhanced feedback is stored when the OpenAI call returns valid JSON
  - rubric-only feedback is preserved when the OpenAI call is unavailable

## Remaining Follow-up

- Add bounded retry/queue handling for async validator execution if needed later.
- Decide whether course-level thresholds should become per-course config instead of a shared default.
