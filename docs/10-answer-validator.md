# Subjective Answer Validation Spec (v3.0)

## Scope

This validator grades open-ended lesson answers and decides whether a completion can be accepted by the progress pipeline.

It is off-chain and feeds verified completion events.

## Supported Validation Modes

1. rubric scoring (deterministic)
2. LLM-assisted scoring (structured output)
3. hybrid mode (rubric floor + LLM feedback)

Default mode:

- rubric-first acceptance check
- LLM feedback for explanatory guidance

## Required Request Context

Validator input must include:

- question id
- lesson id and version
- prompt text
- rubric criteria and weights
- learner answer text
- language and optional locale

## Required Output Shape

- `accepted: boolean`
- `score: 0..100`
- `criteria_breakdown[]`
- `feedback_summary`
- `validator_version`
- `decision_hash` (for auditability)

## Acceptance Policy

A submission is completion-eligible only when:

- `accepted == true`
- score meets course/question threshold
- no integrity flags are triggered

Accepted submission then flows into the same verified completion event pipeline used by objective question types.

## Integrity Controls

1. idempotency key per attempt
2. bounded retry policy
3. audit trail for prompt, rubric, decision, and version
4. abuse heuristics (copy/paste spam, impossible speed)
5. model timeout fallback to rubric-only evaluation

## Cost and Performance Controls

- cache deterministic rubric results
- throttle LLM calls for repeated near-identical answers
- asynchronous grading allowed with interim `pending` status

## User Experience Requirements

Feedback must be instructive, not binary.
At minimum, show:

- what was correct
- what key concept was missing
- how to improve next attempt

## On-chain Coupling Rule

Validator never writes on-chain directly.
Only verified completion events from backend workers may trigger on-chain Fuel/streak updates.
