import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Client } = require('../backend/node_modules/pg');

const RELEASE_NAME = 'dev-rich-starter-lessons-v1';
const UPDATED_LESSON_IDS = ['sf-1', 'sf-2', 'ad-1', 'rs-1', 'dp-1'];

const RICH_LESSONS = {
  'sf-1': {
    courseId: 'solana-fundamentals',
    moduleId: 'solana-fundamentals-module-core',
    title: 'What is Solana?',
    order: 1,
    versionTag: 'sf-1-v2',
    sourceUrl:
      'https://github.com/solana-foundation/developer-content/tree/main/content/courses/intro-to-solana',
    citationNote: 'Richer Solana Fundamentals starter lesson for dev catalog.',
    blocks: [
      'Solana is a high-performance blockchain designed for decentralized applications and crypto-currencies. It can process thousands of transactions per second with sub-second finality, making it one of the fastest blockchains in existence.',
      'Unlike Ethereum which uses a global state machine, Solana uses a unique combination of Proof of History (PoH) and Proof of Stake (PoS) to achieve consensus. Proof of History creates a historical record that proves events occurred at a specific moment in time, acting as a cryptographic clock for the network.',
      'Solana was founded by Anatoly Yakovenko in 2017 and launched its mainnet beta in March 2020. The native token is SOL, which is used for transaction fees and staking.',
    ],
    questions: [
      {
        id: 'sf-1-v2-q1',
        type: 'mcq',
        prompt: 'What consensus mechanisms does Solana combine?',
        correctAnswer: 'Proof of History and Proof of Stake',
        options: [
          'Proof of Work and Proof of Stake',
          'Proof of History and Proof of Stake',
          'Delegated Proof of Stake and Proof of Authority',
          'Proof of History and Proof of Work',
        ],
      },
      {
        id: 'sf-1-v2-q2',
        type: 'short_text',
        prompt: "What is the name of Solana's native token?",
        correctAnswer: 'SOL',
      },
    ],
  },
  'sf-2': {
    courseId: 'solana-fundamentals',
    moduleId: 'solana-fundamentals-module-core',
    title: 'Program Derived Addresses',
    order: 2,
    versionTag: 'sf-2-v2',
    sourceUrl: 'https://solana.com/docs/core/pda',
    citationNote: 'Richer PDA lesson for dev catalog using current Solana docs.',
    blocks: [
      'Program Derived Addresses (PDAs) are 32-byte account addresses that are deterministically derived from a program ID and a set of seeds.',
      'PDAs are guaranteed to be off the Ed25519 curve, which means no private key exists for them. Because there is no private key, users cannot sign for a PDA the way they would sign for a normal wallet keypair.',
      'Only the program whose ID was used in the derivation can sign for a PDA, and it does so through invoke_signed during cross-program invocations. PDAs are useful for deterministic addressing, user-scoped state, and program-owned authorities.',
    ],
    questions: [
      {
        id: 'sf-2-v2-q1',
        type: 'short_text',
        prompt: 'What does PDA stand for on Solana?',
        correctAnswer: 'Program Derived Address',
        metadata: {
          validator: {
            mode: 'rubric_v1',
            acceptThreshold: 67,
            criteria: [
              {
                id: 'program',
                label: 'Mentions Program',
                kind: 'keywords',
                keywords: ['program'],
                weight: 34,
                required: true,
                feedbackPass: 'You identified the Program part correctly.',
                feedbackMiss: 'Mention that the phrase starts with Program.',
              },
              {
                id: 'derived',
                label: 'Mentions Derived',
                kind: 'keywords',
                keywords: ['derived'],
                weight: 33,
                required: true,
                feedbackPass: 'You included the Derived part correctly.',
                feedbackMiss: 'Include the word Derived in your answer.',
              },
              {
                id: 'address',
                label: 'Mentions Address',
                kind: 'keywords',
                keywords: ['address'],
                weight: 33,
                required: true,
                feedbackPass: 'You included the Address part correctly.',
                feedbackMiss: 'Include the word Address in your answer.',
              },
            ],
          },
        },
      },
      {
        id: 'sf-2-v2-q2',
        type: 'mcq',
        prompt: 'What mechanism lets a Solana program sign for a PDA?',
        correctAnswer: 'invoke_signed',
        options: ['sign_message', 'invoke_signed', 'derive_program_address', 'recent_blockhash'],
      },
    ],
  },
  'ad-1': {
    courseId: 'anchor-dev',
    moduleId: 'anchor-dev-module-core',
    title: 'What is Anchor?',
    order: 1,
    versionTag: 'ad-1-v2',
    sourceUrl: 'https://www.anchor-lang.com/docs/basics/program-structure',
    citationNote: 'Richer Anchor starter lesson for dev catalog.',
    blocks: [
      'Anchor is a framework for Solana program development that provides a set of developer tools for writing, testing, and deploying programs. It abstracts away much of the boilerplate required for raw Solana development using the Rust-based Solana SDK.',
      "Anchor uses an Interface Definition Language (IDL) to describe your program's instructions and accounts. The IDL is auto-generated from your Rust code and used by clients to interact with the program. Think of it like an ABI in Ethereum.",
      'The framework provides macros like #[program], #[derive(Accounts)], and #[account] that generate the serialization, deserialization, and validation code you would otherwise write by hand.',
    ],
    questions: [
      {
        id: 'ad-1-v2-q1',
        type: 'mcq',
        prompt: "What does Anchor use to describe a program's interface?",
        correctAnswer: 'IDL (Interface Definition Language)',
        options: [
          'ABI (Application Binary Interface)',
          'IDL (Interface Definition Language)',
          'JSON Schema',
          'Protocol Buffers',
        ],
      },
      {
        id: 'ad-1-v2-q2',
        type: 'short_text',
        prompt: 'What Rust attribute macro marks the main module of an Anchor program?',
        correctAnswer: '#[program]',
      },
    ],
  },
  'rs-1': {
    courseId: 'rust-solana',
    moduleId: 'rust-solana-module-core',
    title: 'Ownership & Borrowing',
    order: 1,
    versionTag: 'rs-1-v2',
    sourceUrl: 'https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html',
    citationNote: 'Richer Rust starter lesson for dev catalog.',
    blocks: [
      "Rust's ownership system is its most distinctive feature. Every value in Rust has a single owner, and when the owner goes out of scope the value is dropped (freed). This eliminates the need for a garbage collector.",
      'Borrowing lets you reference a value without taking ownership. There are two types: immutable references (&T) and mutable references (&mut T). You can have either one mutable reference OR any number of immutable references at a time — never both.',
      'This system prevents data races at compile time and is key to writing safe, concurrent Solana programs. When you see errors like "value moved here" or "cannot borrow as mutable", the compiler is enforcing these ownership rules.',
    ],
    questions: [
      {
        id: 'rs-1-v2-q1',
        type: 'mcq',
        prompt: 'How many mutable references to a value can exist at the same time?',
        correctAnswer: 'One',
        options: ['Zero', 'One', 'Two', 'Unlimited'],
      },
      {
        id: 'rs-1-v2-q2',
        type: 'short_text',
        prompt: 'What symbol denotes an immutable reference in Rust?',
        correctAnswer: '&',
      },
    ],
  },
  'dp-1': {
    courseId: 'defi-protocols',
    moduleId: 'defi-protocols-module-core',
    title: 'Automated Market Makers',
    order: 1,
    versionTag: 'dp-1-v2',
    sourceUrl: 'https://docs.orca.so/whirlpools/overview',
    citationNote: 'Richer DeFi starter lesson for dev catalog.',
    blocks: [
      'Automated Market Makers (AMMs) are the backbone of decentralized exchanges. Instead of matching buy and sell orders like a traditional exchange, AMMs use liquidity pools and mathematical formulas to determine token prices.',
      'The most common formula is the constant product formula: x * y = k, where x and y are the reserves of two tokens. When you swap token A for token B, you add A to the pool and remove B, maintaining the constant k. This creates a price curve.',
      'On Solana, major AMMs include Raydium (which combines AMM with an order book), Orca (known for concentrated liquidity), and Jupiter (a DEX aggregator that routes across multiple AMMs for the best price).',
    ],
    questions: [
      {
        id: 'dp-1-v2-q1',
        type: 'mcq',
        prompt: 'What is the constant product formula used by AMMs?',
        correctAnswer: 'x * y = k',
        options: ['x + y = k', 'x * y = k', 'x / y = k', 'x ^ y = k'],
      },
      {
        id: 'dp-1-v2-q2',
        type: 'short_text',
        prompt: 'What Solana protocol is known as a DEX aggregator?',
        correctAnswer: 'Jupiter',
      },
    ],
  },
};

function parseEnvFile(filePath) {
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function withReleaseId(payload, releaseId) {
  return { ...payload, releaseId };
}

function makeLessonPayload(lessonId, releaseId) {
  const lesson = RICH_LESSONS[lessonId];
  return {
    id: lessonId,
    courseId: lesson.courseId,
    moduleId: lesson.moduleId,
    title: lesson.title,
    order: lesson.order,
    version: 2,
    releaseId,
    blocks: lesson.blocks.map((text, index) => ({
      id: `${lessonId}-v2-block-${index + 1}`,
      type: 'paragraph',
      order: index + 1,
      text,
    })),
    questions: lesson.questions.map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      ...(question.options
        ? {
            options: question.options.map((text, index) => ({
              id: `${question.id}-opt-${index + 1}`,
              text,
            })),
          }
        : {}),
      ...(question.type === 'short_text' ? {} : {}),
    })),
  };
}

async function main() {
  const env = {
    ...parseEnvFile('.env'),
    ...parseEnvFile('backend/.env'),
  };

  const client = new Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  try {
    await client.query('begin');

    const existingRelease = await client.query(
      'select id::text from lesson.publish_releases where release_name = $1 limit 1',
      [RELEASE_NAME],
    );
    if (existingRelease.rowCount > 0) {
      await client.query('rollback');
      console.log(JSON.stringify({ status: 'already_exists', releaseId: existingRelease.rows[0].id }, null, 2));
      return;
    }

    const latestRelease = await client.query(
      'select id::text as id from lesson.publish_releases order by created_at desc limit 1',
    );
    const latestReleaseId = latestRelease.rows[0]?.id;
    if (!latestReleaseId) {
      throw new Error('No existing published release found.');
    }

    const releaseInsert = await client.query(
      `insert into lesson.publish_releases (release_name, notes, created_by)
       values ($1, $2, 'seed-script')
       returning id::text as id`,
      [RELEASE_NAME, 'Deepens the five thin starter lessons with richer content and question sets.'],
    );
    const releaseId = releaseInsert.rows[0].id;

    await client.query(
      `insert into lesson.published_modules (release_id, course_id, module_id, module_order, payload)
       select $1::uuid, course_id, module_id, module_order, payload
       from lesson.published_modules
       where release_id::text = $2`,
      [releaseId, latestReleaseId],
    );

    await client.query(
      `insert into lesson.published_lessons (release_id, lesson_id, module_id, lesson_version_id, lesson_order, payload)
       select
         $1::uuid,
         lesson_id,
         module_id,
         lesson_version_id,
         lesson_order,
         jsonb_set(payload, '{releaseId}', to_jsonb($1::text))
       from lesson.published_lessons
       where release_id::text = $2
         and lesson_id <> all($3::text[])`,
      [releaseId, latestReleaseId, UPDATED_LESSON_IDS],
    );

    await client.query(
      `insert into lesson.published_lesson_payloads (release_id, lesson_id, payload, content_hash)
       select
         $1::uuid,
         lesson_id,
         jsonb_set(payload, '{releaseId}', to_jsonb($1::text)),
         md5(jsonb_set(payload, '{releaseId}', to_jsonb($1::text))::text)
       from lesson.published_lesson_payloads
       where release_id::text = $2
         and lesson_id <> all($3::text[])`,
      [releaseId, latestReleaseId, UPDATED_LESSON_IDS],
    );

    for (const lessonId of UPDATED_LESSON_IDS) {
      const lesson = RICH_LESSONS[lessonId];
      const nextVersion = await client.query(
        'select coalesce(max(version), 0) + 1 as version from lesson.lesson_versions where lesson_id = $1',
        [lessonId],
      );
      const version = Number(nextVersion.rows[0].version);

      const versionInsert = await client.query(
        `insert into lesson.lesson_versions (
           lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
         ) values ($1, $2, 'published', $3::uuid, $4, md5($5), 'seed-script', now())
         returning id::text as id`,
        [lessonId, version, releaseId, `Richer starter lesson content for ${lessonId}.`, lesson.versionTag],
      );
      const lessonVersionId = versionInsert.rows[0].id;

      for (const [index, text] of lesson.blocks.entries()) {
        await client.query(
          `insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload)
           values ($1::uuid, $2, 'paragraph', $3::jsonb)`,
          [
            lessonVersionId,
            index + 1,
            JSON.stringify({
              id: `${lessonId}-v2-block-${index + 1}`,
              type: 'paragraph',
              order: index + 1,
              text,
            }),
          ],
        );
      }

      for (const [index, question] of lesson.questions.entries()) {
        await client.query(
          `insert into lesson.questions (
             id, lesson_version_id, question_order, question_type, prompt, correct_answer, metadata
           ) values ($1, $2::uuid, $3, $4, $5, $6, $7::jsonb)`,
          [
            question.id,
            lessonVersionId,
            index + 1,
            question.type,
            question.prompt,
            question.correctAnswer,
            JSON.stringify(question.metadata ?? {}),
          ],
        );

        for (const [optionIndex, optionText] of (question.options ?? []).entries()) {
          await client.query(
            `insert into lesson.question_options (question_id, option_order, option_text)
             values ($1, $2, $3)`,
            [question.id, optionIndex + 1, optionText],
          );
        }
      }

      await client.query(
        `insert into lesson.source_attributions (
           lesson_version_id, source_url, source_repo, source_ref, source_license, citation_note
         ) values ($1::uuid, $2, $3, $4, 'unknown', $5)`,
        [
          lessonVersionId,
          lesson.sourceUrl,
          lesson.sourceUrl.includes('anchor-lang')
            ? 'anchor-lang'
            : lesson.sourceUrl.includes('rust-lang')
              ? 'rust-lang/book'
              : lesson.sourceUrl.includes('solana.com')
                ? 'solana.com'
                : 'source',
          'starter-content',
          lesson.citationNote,
        ],
      );

      const payload = makeLessonPayload(lessonId, releaseId);

      await client.query(
        `insert into lesson.published_lessons (
           release_id, lesson_id, module_id, lesson_version_id, lesson_order, payload
         ) values ($1::uuid, $2, $3, $4::uuid, $5, $6::jsonb)`,
        [releaseId, lessonId, lesson.moduleId, lessonVersionId, lesson.order, JSON.stringify(payload)],
      );

      await client.query(
        `insert into lesson.published_lesson_payloads (release_id, lesson_id, payload, content_hash)
         values ($1::uuid, $2, $3::jsonb, md5(($3::jsonb)::text))`,
        [releaseId, lessonId, JSON.stringify(payload)],
      );
    }

    await client.query('commit');
    console.log(JSON.stringify({ status: 'published', releaseId, updatedLessons: UPDATED_LESSON_IDS }, null, 2));
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
