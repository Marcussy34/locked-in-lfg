# Answer Validator for Subjective Answers

## What This Is

A system for evaluating open-ended, subjective lesson answers that can't be graded with simple keyword matching or multiple choice comparison. When a lesson asks "Explain why Solana uses Proof of History" or "Describe how you would design an NFT marketplace," the answer validator determines whether the response demonstrates understanding.

## Current State

The app currently supports two question types: MCQ (compared against a correct index) and short text (substring/keyword matching against accepted patterns). There is no handling for longer, subjective responses. The answer validation service directory exists but is empty.

## How It Should Work

### Validation Approaches

**Option A: AI-Powered Validation (Recommended)**
1. User submits a written answer to a subjective question.
2. The answer is sent to a backend API along with the question context, the lesson content, and grading criteria.
3. The backend calls an LLM (like Claude) with a structured prompt: "Given this lesson about X, and this question, does the following answer demonstrate understanding? Score 0-100 and explain why."
4. The LLM returns a score and explanation.
5. The app displays the score and feedback to the user.
6. If the score meets a threshold (e.g., 60+), the answer is accepted and the user earns their fragment reward.

**Option B: Rubric-Based Validation**
1. Each subjective question comes with a rubric: a list of key concepts that should be mentioned.
2. The validator checks for the presence of these concepts (more sophisticated than simple keyword matching — uses semantic similarity or NLP).
3. Score is based on how many rubric items are addressed.
4. Less flexible but cheaper and more predictable than full AI grading.

**Option C: Peer Review (Future)**
1. User submits an answer.
2. Other users review and rate the answer.
3. Consensus determines the score.
4. Incentivize reviewers with Fuel fragments.
5. This is complex and requires a critical mass of users.

### Feedback Quality
- The validator should not just say "correct" or "incorrect."
- It should explain what was good about the answer and what was missed.
- This turns the validation step into a learning moment — the user understands their gaps.

## Where Solana Fits In

- Solana is not directly involved in answer validation — this is an off-chain AI/backend operation.
- However, the result of validation (pass/fail, score) triggers backend effects: Fuel fragment credits, streak completion recording, and optionally a proof hash stored on-chain.
- If answer integrity is important (preventing cheating for leaderboard purposes), a hash of the question + answer + score could be stored on-chain as a lightweight proof. But this adds cost and complexity for marginal benefit.

## Key Considerations

- AI validation costs money per API call. Need to consider: batch processing, caching similar answers, or limiting subjective questions per lesson.
- Latency: AI grading takes a few seconds. The UX should show a "grading your answer..." loading state.
- Cheating prevention: users could paste AI-generated answers. Options to combat this: time limits on answers, requiring the app to be in foreground, comparing answer patterns across users, or simply accepting it (the goal is learning, and even reading an AI answer teaches something).
- The validator should be configurable per question — some questions need strict accuracy (technical facts), others just need demonstrated thought (opinion/analysis).
- Start with AI-powered validation (Option A) for quality, fall back to rubric-based (Option B) if costs become prohibitive.

## Related Files

- `src/screens/main/LessonScreen.tsx` — where answers are submitted
- `src/types/lesson.ts` — Question type definition
- `src/services/api/` — where the validation service should live
- `src/data/mockCourses.ts` — current question format (MCQ + short text)
