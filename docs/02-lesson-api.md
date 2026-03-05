# Lesson API / DIY Self-Made Lessons

## What This Is

The system for sourcing, creating, and delivering lesson content to users. This is entirely a platform-side concern — we (the team) build and curate all lessons. Content comes from two paths: pulling from existing Solana ecosystem educational material (official docs, open-source courses, community resources), or writing our own original lessons based on those same official sources. The API serves this content to the app.

## Current State

As of March 5, 2026, lesson data still has a local fallback source (`src/data/mockCourses.ts`), but the app now has a modular API client architecture in place:

- `src/services/api/content/*` for catalog and lesson delivery contracts
- `src/services/api/auth/*` for wallet challenge/verify session flows
- `src/services/api/progress/*` for lesson start/submit/progress reads
- `src/services/api/adapters/*` with swappable providers (`http` and `mock`)
- `src/services/repositories/contentRepository.ts` to map API payloads into app domain/state
- `backend/sql/0001_lesson_platform.sql` for scalable module-first Postgres schema
- `backend/openapi/lesson-api-v1.yaml` for v1 endpoint contracts

The course store (`src/stores/courseStore.ts`) now initializes content through this provider/repository pipeline and falls back to mock content when no remote API base URL is configured.

## Implemented Architecture (v1 Scaffold)

### Content Model

- `course -> module -> lesson -> blocks -> questions`
- Module is a first-class layer to support large catalogs and reuse patterns.
- Question types in v1: `mcq` and `short_text`.

### API Boundary

- Public reads: courses, modules, lessons, content version
- Authenticated writes: lesson progress start/submit, progress snapshots
- Wallet-signature auth flow is defined in contracts (`/v1/auth/challenge`, `/v1/auth/verify`, `/v1/auth/refresh`)

### Runtime Strategy in App

- If `EXPO_PUBLIC_LESSON_API_BASE_URL` is set, app uses the HTTP content provider.
- If not set, app uses the mock provider that emits the same API payload shape.
- This keeps screen/store code stable while backend implementation is being built.

## How It Should Work

### Source 1: Integrating Existing Solana Courses and Content

There is a significant amount of structured Solana educational content already available — much of it open source and free to adapt. Here are the key sources we've identified:

**Solana Foundation Official Resources**
- **solana-foundation/developer-content** (GitHub, archived Jan 2025) — The Solana Foundation's official course library. Contains 11 full courses in markdown format, each broken into lesson files with explanations and exercises. Courses include: Intro to Solana, Tokens and NFTs, On-chain Development, Native On-chain Development, Program Security, Program Optimization, Token Extensions, State Compression, Solana Pay, Offline Transactions, and Connecting to Off-chain Data. This is open source and the most directly usable source.
- **solana-foundation/curriculum** (GitHub, actively maintained) — A newer curriculum repo designed for universities and bootcamps. Contains 5 structured courses: Blockchain Basics, Rust Basics for Solana Development, Anchor and Programs, SPL Tokens 2022 and Extensions, and Web for Solana Development 101. Each course has week-by-week breakdowns with teaching resources and exercises. Recently updated (Jan 2026) to use modern framework-kit patterns.
- **solana.com/developers/courses** — The official Solana developer courses page, which links to the above content.
- **solana.com/developers/guides** — Step-by-step developer guides covering specific tasks (storing SOL in PDAs, interacting with tokens in programs, etc.).

**Community and Third-Party Courses**
- **RareSkills "60 Days of Solana"** — A comprehensive 60-day course (8 modules, 60+ lessons) designed for developers transitioning from Ethereum/EVM to Solana. Covers everything from Hello World through Anchor, accounts, PDAs, SPL tokens, Token-2022, cross-program invocation, native programs, and even sBPF assembly. Supported by a Solana Foundation grant. Excellent for adapting into structured lessons with progressive difficulty.
- **LearnSol.site** — A free structured course with 5 modules (38 total lessons): Solana Fundamentals (5 lessons), Rust for Solana (11 lessons), Anchor Framework (8 lessons), Client-Side & Full-Stack (7 lessons), and Capstone & Portfolio (7 lessons).
- **freeCodeCamp Solana Curriculum** — 10 interactive practice projects covering the Solana protocol and tools.
- **Metacrafters SOL PROOF** — A beginner course (3 modules, ~21 hours) covering Solana basics, JS-based transactions, and token/NFT minting. Includes assessments and tests.

**Existing Quiz/Question Sources**
- **Wayground Solana Quizzes** — Includes a 35-question "Solana Development Quiz" and a 112-question "Foundations of Solana and the First Transaction" quiz with MCQ format. These could be adapted directly into our question bank.
- **Scribd "100 Rust, Solana & Full Stack Quiz MCQs"** — 100 MCQs split across Rust Fundamentals, Axum Web Framework, and Solana Blockchain. Useful for Rust + Solana assessment content.
- **Solana Developer Interview Questions** (FinalRound AI) — 25 common Solana developer interview questions with answers. Good source for subjective/short-answer questions.

### Source 2: Writing Our Own Lessons (DIY)

When we write our own, they must be grounded in official and reliable sources:

1. All original lesson content must be based on official Solana documentation (solana.com/docs), the Solana Cookbook, Anchor docs, or other well-established sources in the ecosystem.
2. We write the lesson text, then create questions (MCQ, short text, or subjective) that test comprehension of that material.
3. DIY lessons fill gaps that existing content doesn't cover — like our app-specific topics (vault mechanics, token economics, etc.) or niche topics not well covered elsewhere.
4. Any factual claims in lessons should be verifiable against official docs. No speculation or outdated information.

### Content Delivery API
1. A backend API serves the course catalog and individual lesson content to the app.
2. The app fetches available courses on the course browser screen.
3. When a user opens a lesson, the app fetches the full lesson content (text blocks, questions, media).
4. Lesson completion and scores are recorded both locally (Zustand store) and sent to the backend.
5. The backend tracks progress across devices via the user's wallet address as their identity.

## Where Solana Fits In

- **Content source:** The Solana Foundation repos (developer-content, curriculum) are open source and the primary content pool. The developer-content repo has 11 courses already in markdown — these map almost directly to our lesson format.
- **Licensing:** The Solana Foundation developer-content repo is open source. The curriculum repo is public. RareSkills' 60 Days of Solana was funded by a Solana Foundation grant. Need to verify exact license terms for each before adapting, but the ecosystem is generally open about educational content.
- **On-chain usage:** Lesson content itself is off-chain. The user's wallet address is their identity for progress tracking. Lesson completion triggers backend Fuel credits and streak updates; content delivery is a standard API.

## Key Considerations

- Start by adapting the Solana Foundation's developer-content courses — they're the most structured and directly usable. The 11 courses give us a massive content library immediately.
- Supplement with Wayground quiz questions and RareSkills exercises for the question bank.
- Lesson content format should support: plain text, code blocks (with language tags for syntax highlighting), images, and callout boxes (info, warning, tip).
- Question types: MCQ (multiple choice) and short text (keyword matching). Subjective answers need a separate validator (see answer-validator doc).
- Consider a content pipeline: scrape/fetch source material → restructure into our lesson format → add questions → review for quality → publish via API.
- Offline support: cache lessons locally so users can complete them without internet.
- Content needs periodic review — Solana evolves fast (e.g., the curriculum repo was updated in Jan 2026 to replace Gill with framework-kit). Lessons must stay current.

## Source Links

- https://github.com/solana-foundation/developer-content/tree/main/content/courses (11 courses, archived)
- https://github.com/solana-foundation/curriculum (5 courses, actively maintained)
- https://solana.com/developers/courses (official courses page)
- https://solana.com/developers/guides (step-by-step guides)
- https://rareskills.io/tutorials/solana-tutorial (60 Days of Solana)
- https://www.learnsol.site/modules (LearnSol 38-lesson course)
- https://www.freecodecamp.org/news/solana-curriculum/ (freeCodeCamp interactive projects)
- https://academy.metacrafters.io/content/solana-intern (Metacrafters beginner course)
- https://wayground.com/admin/quiz/69208cae74f3aeb135ad8a59 (112 Solana MCQs)
- https://www.scribd.com/document/898521290 (100 Rust/Solana MCQs)

## Related Files

- `src/data/mockCourses.ts` — current mock data (the format to follow)
- `src/stores/courseStore.ts` — tracks course enrollment and lesson progress
- `src/types/course.ts`, `src/types/module.ts`, and `src/types/lesson.ts` — modular data type definitions
- `src/services/api/` — modular API layer (`content`, `auth`, `progress`, adapters)
- `src/services/repositories/contentRepository.ts` — maps API snapshot into app state shape
- `backend/sql/0001_lesson_platform.sql` — scalable Postgres schema for lesson platform
- `backend/openapi/lesson-api-v1.yaml` — v1 endpoint contract
