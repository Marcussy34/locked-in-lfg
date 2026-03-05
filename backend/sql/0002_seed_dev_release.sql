-- Dev seed for Lesson API v1.
-- Seeds a single course/module/lesson and a published release snapshot.

create extension if not exists pgcrypto;

DO $$
DECLARE
  v_release_id uuid;
  v_lesson_version_id uuid;
  v_lesson_payload jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM lesson.publish_releases) THEN
    RAISE NOTICE 'Seed skipped: publish_releases already has rows.';
    RETURN;
  END IF;

  -- Core content entities
  INSERT INTO lesson.courses (
    id,
    slug,
    title,
    description,
    category,
    difficulty,
    estimated_minutes
  ) VALUES (
    'solana-fundamentals',
    'solana-fundamentals',
    'Solana Fundamentals',
    'Learn the core concepts of the Solana blockchain.',
    'solana',
    'beginner',
    60
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = now();

  INSERT INTO lesson.modules (
    id,
    slug,
    title,
    description,
    difficulty,
    estimated_minutes
  ) VALUES (
    'solana-fundamentals-module-core',
    'core',
    'Solana Fundamentals Core',
    'Core module for Solana Fundamentals.',
    'beginner',
    60
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    updated_at = now();

  INSERT INTO lesson.course_modules (
    course_id,
    module_id,
    module_order,
    is_required
  ) VALUES (
    'solana-fundamentals',
    'solana-fundamentals-module-core',
    1,
    true
  )
  ON CONFLICT (course_id, module_id) DO UPDATE SET
    module_order = EXCLUDED.module_order,
    is_required = EXCLUDED.is_required;

  INSERT INTO lesson.lessons (
    id,
    slug,
    title
  ) VALUES (
    'sf-1',
    'what-is-solana',
    'What is Solana?'
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    updated_at = now();

  INSERT INTO lesson.module_lessons (
    module_id,
    lesson_id,
    lesson_order,
    is_required
  ) VALUES (
    'solana-fundamentals-module-core',
    'sf-1',
    1,
    true
  )
  ON CONFLICT (module_id, lesson_id) DO UPDATE SET
    lesson_order = EXCLUDED.lesson_order,
    is_required = EXCLUDED.is_required;

  -- Create release
  INSERT INTO lesson.publish_releases (
    release_name,
    notes,
    created_by
  ) VALUES (
    'dev-seed-v1',
    'Initial development seed release.',
    'seed-script'
  )
  RETURNING id INTO v_release_id;

  -- Create published lesson version
  INSERT INTO lesson.lesson_versions (
    lesson_id,
    version,
    state,
    release_id,
    changelog,
    source_fingerprint,
    created_by,
    reviewed_by,
    reviewed_at,
    published_at
  ) VALUES (
    'sf-1',
    1,
    'published',
    v_release_id,
    'Initial seed version',
    'seed-v1',
    'seed-script',
    'seed-script',
    now(),
    now()
  )
  RETURNING id INTO v_lesson_version_id;

  INSERT INTO lesson.lesson_blocks (
    lesson_version_id,
    block_order,
    block_type,
    payload
  ) VALUES (
    v_lesson_version_id,
    1,
    'paragraph',
    jsonb_build_object(
      'id', 'sf-1-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', 'Solana is a high-performance blockchain designed for decentralized applications and payments.'
    )
  );

  INSERT INTO lesson.questions (
    id,
    lesson_version_id,
    question_order,
    question_type,
    prompt,
    correct_answer,
    metadata
  ) VALUES (
    'sf-1-q1',
    v_lesson_version_id,
    1,
    'mcq',
    'What does Solana combine for consensus?',
    'Proof of History and Proof of Stake',
    '{}'::jsonb
  );

  INSERT INTO lesson.question_options (
    question_id,
    option_order,
    option_text
  ) VALUES
    ('sf-1-q1', 1, 'Proof of Work and Proof of Stake'),
    ('sf-1-q1', 2, 'Proof of History and Proof of Stake'),
    ('sf-1-q1', 3, 'Proof of Authority and Proof of Work'),
    ('sf-1-q1', 4, 'Proof of Capacity and Proof of Stake');

  INSERT INTO lesson.source_attributions (
    lesson_version_id,
    source_url,
    source_repo,
    source_ref,
    source_license,
    citation_note
  ) VALUES (
    v_lesson_version_id,
    'https://github.com/solana-foundation/developer-content/tree/main/content/courses/intro-to-solana',
    'solana-foundation/developer-content',
    'main',
    'unknown',
    'Seed content adapted for local development only.'
  );

  v_lesson_payload := jsonb_build_object(
    'id', 'sf-1',
    'courseId', 'solana-fundamentals',
    'moduleId', 'solana-fundamentals-module-core',
    'title', 'What is Solana?',
    'order', 1,
    'version', 1,
    'releaseId', v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'sf-1-block-1',
        'type', 'paragraph',
        'order', 1,
        'text', 'Solana is a high-performance blockchain designed for decentralized applications and payments.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'sf-1-q1',
        'type', 'mcq',
        'prompt', 'What does Solana combine for consensus?',
        'correctAnswer', 'Proof of History and Proof of Stake',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'sf-1-q1-opt-1', 'text', 'Proof of Work and Proof of Stake'),
          jsonb_build_object('id', 'sf-1-q1-opt-2', 'text', 'Proof of History and Proof of Stake'),
          jsonb_build_object('id', 'sf-1-q1-opt-3', 'text', 'Proof of Authority and Proof of Work'),
          jsonb_build_object('id', 'sf-1-q1-opt-4', 'text', 'Proof of Capacity and Proof of Stake')
        )
      )
    )
  );

  INSERT INTO lesson.published_modules (
    release_id,
    course_id,
    module_id,
    module_order,
    payload
  ) VALUES (
    v_release_id,
    'solana-fundamentals',
    'solana-fundamentals-module-core',
    1,
    jsonb_build_object(
      'id', 'solana-fundamentals-module-core',
      'courseId', 'solana-fundamentals',
      'slug', 'core',
      'title', 'Solana Fundamentals Core',
      'description', 'Core module for Solana Fundamentals.',
      'order', 1,
      'difficulty', 'beginner',
      'totalLessons', 1,
      'estimatedMinutes', 60
    )
  );

  INSERT INTO lesson.published_lessons (
    release_id,
    lesson_id,
    module_id,
    lesson_version_id,
    lesson_order,
    payload
  ) VALUES (
    v_release_id,
    'sf-1',
    'solana-fundamentals-module-core',
    v_lesson_version_id,
    1,
    v_lesson_payload
  );

  INSERT INTO lesson.published_lesson_payloads (
    release_id,
    lesson_id,
    payload,
    content_hash
  ) VALUES (
    v_release_id,
    'sf-1',
    v_lesson_payload,
    md5(v_lesson_payload::text)
  );

  RAISE NOTICE 'Seed complete. Release ID: %', v_release_id;
END;
$$;
