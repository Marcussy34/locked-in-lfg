create extension if not exists pgcrypto;

do $seed$
declare
  v_release_id uuid;

  v_tk1_version_id uuid;
  v_tk2_version_id uuid;
  v_tk3_version_id uuid;

  v_tk1_payload jsonb;
  v_tk2_payload jsonb;
  v_tk3_payload jsonb;
begin
  if exists (
    select 1
    from lesson.publish_releases
    where release_name = 'test-kitchen-v1'
  ) then
    raise notice 'Seed skipped: test-kitchen-v1 already exists.';
    return;
  end if;

  ---------------------------------------------------------------------------
  -- 1. Course
  ---------------------------------------------------------------------------
  insert into lesson.courses (
    id,
    slug,
    title,
    description,
    category,
    difficulty,
    estimated_minutes,
    min_principal_amount_usdc,
    max_principal_amount_usdc,
    demo_principal_amount_usdc,
    min_lock_duration_days,
    max_lock_duration_days
  ) values (
    'test-kitchen',
    'test-kitchen',
    'Test Kitchen',
    'A quick course to test all LockedIn features — locking, lessons, variants, questions, streaks, and more.',
    'solana',
    'beginner',
    10,
    1,
    10,
    1,
    10,
    30
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    category = excluded.category,
    difficulty = excluded.difficulty,
    estimated_minutes = excluded.estimated_minutes,
    min_principal_amount_usdc = excluded.min_principal_amount_usdc,
    max_principal_amount_usdc = excluded.max_principal_amount_usdc,
    demo_principal_amount_usdc = excluded.demo_principal_amount_usdc,
    min_lock_duration_days = excluded.min_lock_duration_days,
    max_lock_duration_days = excluded.max_lock_duration_days,
    updated_at = now();

  ---------------------------------------------------------------------------
  -- 2. Module
  ---------------------------------------------------------------------------
  insert into lesson.modules (
    id,
    slug,
    title,
    description,
    difficulty,
    estimated_minutes
  ) values (
    'test-kitchen-module',
    'test-kitchen-core',
    'Test Kitchen Core',
    'Core module for the Test Kitchen course — testing all LockedIn features.',
    'beginner',
    10
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    difficulty = excluded.difficulty,
    estimated_minutes = excluded.estimated_minutes,
    updated_at = now();

  insert into lesson.course_modules (course_id, module_id, module_order, is_required) values
    ('test-kitchen', 'test-kitchen-module', 1, true)
  on conflict (course_id, module_id) do update set
    module_order = excluded.module_order,
    is_required = excluded.is_required;

  ---------------------------------------------------------------------------
  -- 3. Lessons
  ---------------------------------------------------------------------------
  insert into lesson.lessons (id, slug, title) values
    ('tk-1', 'testing-visual-blocks',       'Testing Visual Blocks'),
    ('tk-2', 'testing-more-variants',       'Testing More Variants'),
    ('tk-3', 'testing-recall-and-completion','Testing Recall & Completion')
  on conflict (id) do update set
    title = excluded.title,
    updated_at = now();

  insert into lesson.module_lessons (module_id, lesson_id, lesson_order, is_required) values
    ('test-kitchen-module', 'tk-1', 1, true),
    ('test-kitchen-module', 'tk-2', 2, true),
    ('test-kitchen-module', 'tk-3', 3, true)
  on conflict (module_id, lesson_id) do update set
    lesson_order = excluded.lesson_order,
    is_required = excluded.is_required;

  ---------------------------------------------------------------------------
  -- 4. Publish release
  ---------------------------------------------------------------------------
  insert into lesson.publish_releases (release_name, notes, created_by)
  values (
    'test-kitchen-v1',
    'Test Kitchen course — 3 short lessons testing all block variants, question types, recall, and completion.',
    'seed-script'
  )
  returning id into v_release_id;

  ---------------------------------------------------------------------------
  -- 5. Lesson versions
  ---------------------------------------------------------------------------
  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('tk-1', 1, 'published', v_release_id, 'Initial lesson: Testing Visual Blocks.', md5('tk-1-v1'), 'seed-script', now())
  returning id into v_tk1_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('tk-2', 1, 'published', v_release_id, 'Initial lesson: Testing More Variants.', md5('tk-2-v1'), 'seed-script', now())
  returning id into v_tk2_version_id;

  insert into lesson.lesson_versions (
    lesson_id, version, state, release_id, changelog, source_fingerprint, created_by, published_at
  ) values
    ('tk-3', 1, 'published', v_release_id, 'Initial lesson: Testing Recall & Completion.', md5('tk-3-v1'), 'seed-script', now())
  returning id into v_tk3_version_id;

  ---------------------------------------------------------------------------
  -- 6. Lesson blocks
  ---------------------------------------------------------------------------

  -- ========================================================================
  -- tk-1: Testing Visual Blocks
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_tk1_version_id, 1, 'paragraph',
    jsonb_build_object(
      'id', 'tk-1-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', $$Welcome to the Test Kitchen

This course exists to test every feature of LockedIn. Each section below uses a different visual component. If you can see them all rendered correctly, the system works.$$
    )
  ),
  (
    v_tk1_version_id, 2, 'callout',
    jsonb_build_object(
      'id', 'tk-1-block-2',
      'type', 'callout',
      'order', 2,
      'variant', 'analogy',
      'title', 'Test Analogy Box',
      'text', 'This is an analogy box. It should have a lightbulb icon and an amber border. Used for analogies like ''The Village Notebook'' or ''The Vending Machine''.',
      'calloutTone', 'info'
    )
  ),
  (
    v_tk1_version_id, 3, 'paragraph',
    jsonb_build_object(
      'id', 'tk-1-block-3',
      'type', 'paragraph',
      'order', 3,
      'variant', 'chain-cards',
      'text', '',
      'chains', jsonb_build_array(
        jsonb_build_object('name', 'Bitcoin', 'tagline', 'The Original', 'desc', 'Orange card with stat badges', 'stats', jsonb_build_array('~10 min', '$1-$20/tx'), 'theme', 'btc'),
        jsonb_build_object('name', 'Ethereum', 'tagline', 'The Platform', 'desc', 'Blue card with stat badges', 'stats', jsonb_build_array('~12 sec', '$5-$50/tx'), 'theme', 'eth'),
        jsonb_build_object('name', 'Solana', 'tagline', 'The Fast One', 'desc', 'Purple card with stat badges', 'stats', jsonb_build_array('~0.4 sec', '$0.00025/tx'), 'theme', 'sol')
      )
    )
  ),
  (
    v_tk1_version_id, 4, 'paragraph',
    jsonb_build_object(
      'id', 'tk-1-block-4',
      'type', 'paragraph',
      'order', 4,
      'variant', 'flow',
      'text', 'Testing the flow steps component:',
      'steps', jsonb_build_array(
        jsonb_build_object('title', 'Step One', 'desc', 'This is the first step'),
        jsonb_build_object('title', 'Step Two', 'desc', 'This is the second step'),
        jsonb_build_object('title', 'Step Three', 'desc', 'This is the third step'),
        jsonb_build_object('title', 'Complete', 'desc', 'The flow is done', 'icon', E'\u2713', 'color', 'green')
      )
    )
  ),
  (
    v_tk1_version_id, 5, 'paragraph',
    jsonb_build_object(
      'id', 'tk-1-block-5',
      'type', 'paragraph',
      'order', 5,
      'variant', 'concepts',
      'text', 'Testing concept list:',
      'items', jsonb_build_array(
        jsonb_build_object('icon', E'\U0001F4C1', 'name', 'Concept A', 'desc', 'Icon with name and description'),
        jsonb_build_object('icon', E'\U0001FA99', 'name', 'Concept B', 'desc', 'Another concept item'),
        jsonb_build_object('icon', E'\u2699', 'name', 'Concept C', 'desc', 'Third concept with icon')
      )
    )
  ),
  (
    v_tk1_version_id, 6, 'callout',
    jsonb_build_object(
      'id', 'tk-1-block-6',
      'type', 'callout',
      'order', 6,
      'variant', 'takeaway',
      'calloutTone', 'tip',
      'text', 'This is a takeaway box. It should have a green left border and a ''Key Takeaway'' label. **Bold text works here too.**'
    )
  );

  -- ========================================================================
  -- tk-2: Testing More Variants
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_tk2_version_id, 1, 'code',
    jsonb_build_object(
      'id', 'tk-2-block-1',
      'type', 'code',
      'order', 1,
      'variant', 'comparison',
      'headers', jsonb_build_array('Feature', 'Option A', 'Option B'),
      'rows', jsonb_build_array(
        jsonb_build_array('Speed', 'Fast', 'Slow'),
        jsonb_build_array('Cost', 'Cheap', 'Expensive'),
        jsonb_build_array('Ease', 'Simple', 'Complex')
      )
    )
  ),
  (
    v_tk2_version_id, 2, 'paragraph',
    jsonb_build_object(
      'id', 'tk-2-block-2',
      'type', 'paragraph',
      'order', 2,
      'variant', 'kv-grid',
      'items', jsonb_build_array(
        jsonb_build_object('label', 'Label One', 'value', 'Value 1', 'desc', 'Description here', 'color', 'amber'),
        jsonb_build_object('label', 'Label Two', 'value', 'Value 2', 'desc', 'Another description', 'color', 'green')
      )
    )
  ),
  (
    v_tk2_version_id, 3, 'callout',
    jsonb_build_object(
      'id', 'tk-2-block-3',
      'type', 'callout',
      'order', 3,
      'variant', 'scam',
      'number', 1,
      'title', 'Test Scam Card',
      'example', 'This is a fake scam message for testing. Do not panic — this is just a test.',
      'exampleSender', 'Fake_Scammer_123',
      'rule', 'This is where the safety rule goes. **Bold rules work too.**',
      'calloutTone', 'warning'
    )
  ),
  (
    v_tk2_version_id, 4, 'paragraph',
    jsonb_build_object(
      'id', 'tk-2-block-4',
      'type', 'paragraph',
      'order', 4,
      'variant', 'checklist',
      'items', jsonb_build_array(
        '**First item** — checklist items should have green checkboxes',
        '**Second item** — bold text should be emphasized',
        '**Third item** — all items should have bottom borders'
      )
    )
  ),
  (
    v_tk2_version_id, 5, 'callout',
    jsonb_build_object(
      'id', 'tk-2-block-5',
      'type', 'callout',
      'order', 5,
      'calloutTone', 'warning',
      'text', 'Warning Callout: This tests the default callout styling with a warning tone. Should have a red left border.'
    )
  );

  -- ========================================================================
  -- tk-3: Testing Recall & Completion
  -- ========================================================================
  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_tk3_version_id, 1, 'paragraph',
    jsonb_build_object(
      'id', 'tk-3-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', $$Final Stretch

If you're seeing this, Lessons 1 and 2 worked. Before this lesson loaded, you should have seen a **recall question** from a previous lesson.

Complete the questions below to finish the test course. After this, you can test the withdrawal flow.$$
    )
  ),
  (
    v_tk3_version_id, 2, 'callout',
    jsonb_build_object(
      'id', 'tk-3-block-2',
      'type', 'callout',
      'order', 2,
      'variant', 'takeaway',
      'calloutTone', 'tip',
      'text', 'Course complete! All visual block variants render correctly. All question types work. The recall system triggers. You can now test locking, streaks, fuel, and withdrawal.'
    )
  );

  ---------------------------------------------------------------------------
  -- 7. Questions
  ---------------------------------------------------------------------------

  -- tk-1 questions
  insert into lesson.questions (id, lesson_version_id, question_order, question_type, prompt, correct_answer, metadata) values
    ('tk-1-q1', v_tk1_version_id, 1, 'mcq', 'Which block type shows colored cards for different blockchains?', 'chain-cards', '{}'::jsonb),
    ('tk-1-q2', v_tk1_version_id, 2, 'mcq', 'What color is the takeaway box border?', 'Green', '{}'::jsonb),

  -- tk-2 questions
    ('tk-2-q1', v_tk2_version_id, 1, 'mcq', 'What does the scam card display?', 'A fake DM preview with a safety rule', '{}'::jsonb),
    ('tk-2-q2', v_tk2_version_id, 2, 'short_text', 'Name two block variants you saw in this lesson.', 'comparison kv-grid scam checklist callout', '{}'::jsonb),

  -- tk-3 questions
    ('tk-3-q1', v_tk3_version_id, 1, 'mcq', 'Did you see a recall question before this lesson?', 'Yes', '{}'::jsonb),
    ('tk-3-q2', v_tk3_version_id, 2, 'mcq', 'How many block variants does LockedIn support?', '10', '{}'::jsonb);

  ---------------------------------------------------------------------------
  -- 8. Question options (MCQ only)
  ---------------------------------------------------------------------------
  insert into lesson.question_options (question_id, option_order, option_text) values
    -- tk-1-q1
    ('tk-1-q1', 1, 'chain-cards'),
    ('tk-1-q1', 2, 'paragraph'),
    ('tk-1-q1', 3, 'callout'),
    -- tk-1-q2
    ('tk-1-q2', 1, 'Green'),
    ('tk-1-q2', 2, 'Amber'),
    ('tk-1-q2', 3, 'Red'),

    -- tk-2-q1
    ('tk-2-q1', 1, 'A chart'),
    ('tk-2-q1', 2, 'A fake DM preview with a safety rule'),
    ('tk-2-q1', 3, 'A code block'),

    -- tk-3-q1
    ('tk-3-q1', 1, 'Yes'),
    ('tk-3-q1', 2, 'No'),
    ('tk-3-q1', 3, 'What''s a recall question?'),
    -- tk-3-q2
    ('tk-3-q2', 1, '3'),
    ('tk-3-q2', 2, '7'),
    ('tk-3-q2', 3, '10');

  ---------------------------------------------------------------------------
  -- 9. Published payloads (sanitized — no correctAnswer)
  ---------------------------------------------------------------------------

  -- tk-1 payload
  v_tk1_payload := jsonb_build_object(
    'id', 'tk-1',
    'courseId', 'test-kitchen',
    'moduleId', 'test-kitchen-module',
    'title', 'Testing Visual Blocks',
    'order', 1,
    'version', 1,
    'releaseId', v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'tk-1-block-1',
        'type', 'paragraph',
        'order', 1,
        'text', $$Welcome to the Test Kitchen

This course exists to test every feature of LockedIn. Each section below uses a different visual component. If you can see them all rendered correctly, the system works.$$
      ),
      jsonb_build_object(
        'id', 'tk-1-block-2',
        'type', 'callout',
        'order', 2,
        'variant', 'analogy',
        'title', 'Test Analogy Box',
        'text', 'This is an analogy box. It should have a lightbulb icon and an amber border. Used for analogies like ''The Village Notebook'' or ''The Vending Machine''.',
        'calloutTone', 'info'
      ),
      jsonb_build_object(
        'id', 'tk-1-block-3',
        'type', 'paragraph',
        'order', 3,
        'variant', 'chain-cards',
        'text', '',
        'chains', jsonb_build_array(
          jsonb_build_object('name', 'Bitcoin', 'tagline', 'The Original', 'desc', 'Orange card with stat badges', 'stats', jsonb_build_array('~10 min', '$1-$20/tx'), 'theme', 'btc'),
          jsonb_build_object('name', 'Ethereum', 'tagline', 'The Platform', 'desc', 'Blue card with stat badges', 'stats', jsonb_build_array('~12 sec', '$5-$50/tx'), 'theme', 'eth'),
          jsonb_build_object('name', 'Solana', 'tagline', 'The Fast One', 'desc', 'Purple card with stat badges', 'stats', jsonb_build_array('~0.4 sec', '$0.00025/tx'), 'theme', 'sol')
        )
      ),
      jsonb_build_object(
        'id', 'tk-1-block-4',
        'type', 'paragraph',
        'order', 4,
        'variant', 'flow',
        'text', 'Testing the flow steps component:',
        'steps', jsonb_build_array(
          jsonb_build_object('title', 'Step One', 'desc', 'This is the first step'),
          jsonb_build_object('title', 'Step Two', 'desc', 'This is the second step'),
          jsonb_build_object('title', 'Step Three', 'desc', 'This is the third step'),
          jsonb_build_object('title', 'Complete', 'desc', 'The flow is done', 'icon', E'\u2713', 'color', 'green')
        )
      ),
      jsonb_build_object(
        'id', 'tk-1-block-5',
        'type', 'paragraph',
        'order', 5,
        'variant', 'concepts',
        'text', 'Testing concept list:',
        'items', jsonb_build_array(
          jsonb_build_object('icon', E'\U0001F4C1', 'name', 'Concept A', 'desc', 'Icon with name and description'),
          jsonb_build_object('icon', E'\U0001FA99', 'name', 'Concept B', 'desc', 'Another concept item'),
          jsonb_build_object('icon', E'\u2699', 'name', 'Concept C', 'desc', 'Third concept with icon')
        )
      ),
      jsonb_build_object(
        'id', 'tk-1-block-6',
        'type', 'callout',
        'order', 6,
        'variant', 'takeaway',
        'calloutTone', 'tip',
        'text', 'This is a takeaway box. It should have a green left border and a ''Key Takeaway'' label. **Bold text works here too.**'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id', 'tk-1-q1', 'type', 'mcq', 'prompt', 'Which block type shows colored cards for different blockchains?', 'options', jsonb_build_array(
        jsonb_build_object('id', 'tk-1-q1-opt-1', 'text', 'chain-cards'),
        jsonb_build_object('id', 'tk-1-q1-opt-2', 'text', 'paragraph'),
        jsonb_build_object('id', 'tk-1-q1-opt-3', 'text', 'callout')
      )),
      jsonb_build_object('id', 'tk-1-q2', 'type', 'mcq', 'prompt', 'What color is the takeaway box border?', 'options', jsonb_build_array(
        jsonb_build_object('id', 'tk-1-q2-opt-1', 'text', 'Green'),
        jsonb_build_object('id', 'tk-1-q2-opt-2', 'text', 'Amber'),
        jsonb_build_object('id', 'tk-1-q2-opt-3', 'text', 'Red')
      ))
    )
  );

  -- tk-2 payload
  v_tk2_payload := jsonb_build_object(
    'id', 'tk-2',
    'courseId', 'test-kitchen',
    'moduleId', 'test-kitchen-module',
    'title', 'Testing More Variants',
    'order', 2,
    'version', 1,
    'releaseId', v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'tk-2-block-1',
        'type', 'code',
        'order', 1,
        'variant', 'comparison',
        'headers', jsonb_build_array('Feature', 'Option A', 'Option B'),
        'rows', jsonb_build_array(
          jsonb_build_array('Speed', 'Fast', 'Slow'),
          jsonb_build_array('Cost', 'Cheap', 'Expensive'),
          jsonb_build_array('Ease', 'Simple', 'Complex')
        )
      ),
      jsonb_build_object(
        'id', 'tk-2-block-2',
        'type', 'paragraph',
        'order', 2,
        'variant', 'kv-grid',
        'items', jsonb_build_array(
          jsonb_build_object('label', 'Label One', 'value', 'Value 1', 'desc', 'Description here', 'color', 'amber'),
          jsonb_build_object('label', 'Label Two', 'value', 'Value 2', 'desc', 'Another description', 'color', 'green')
        )
      ),
      jsonb_build_object(
        'id', 'tk-2-block-3',
        'type', 'callout',
        'order', 3,
        'variant', 'scam',
        'number', 1,
        'title', 'Test Scam Card',
        'example', 'This is a fake scam message for testing. Do not panic — this is just a test.',
        'exampleSender', 'Fake_Scammer_123',
        'rule', 'This is where the safety rule goes. **Bold rules work too.**',
        'calloutTone', 'warning'
      ),
      jsonb_build_object(
        'id', 'tk-2-block-4',
        'type', 'paragraph',
        'order', 4,
        'variant', 'checklist',
        'items', jsonb_build_array(
          '**First item** — checklist items should have green checkboxes',
          '**Second item** — bold text should be emphasized',
          '**Third item** — all items should have bottom borders'
        )
      ),
      jsonb_build_object(
        'id', 'tk-2-block-5',
        'type', 'callout',
        'order', 5,
        'calloutTone', 'warning',
        'text', 'Warning Callout: This tests the default callout styling with a warning tone. Should have a red left border.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id', 'tk-2-q1', 'type', 'mcq', 'prompt', 'What does the scam card display?', 'options', jsonb_build_array(
        jsonb_build_object('id', 'tk-2-q1-opt-1', 'text', 'A chart'),
        jsonb_build_object('id', 'tk-2-q1-opt-2', 'text', 'A fake DM preview with a safety rule'),
        jsonb_build_object('id', 'tk-2-q1-opt-3', 'text', 'A code block')
      )),
      jsonb_build_object('id', 'tk-2-q2', 'type', 'short_text', 'prompt', 'Name two block variants you saw in this lesson.')
    )
  );

  -- tk-3 payload
  v_tk3_payload := jsonb_build_object(
    'id', 'tk-3',
    'courseId', 'test-kitchen',
    'moduleId', 'test-kitchen-module',
    'title', 'Testing Recall & Completion',
    'order', 3,
    'version', 1,
    'releaseId', v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'tk-3-block-1',
        'type', 'paragraph',
        'order', 1,
        'text', $$Final Stretch

If you're seeing this, Lessons 1 and 2 worked. Before this lesson loaded, you should have seen a **recall question** from a previous lesson.

Complete the questions below to finish the test course. After this, you can test the withdrawal flow.$$
      ),
      jsonb_build_object(
        'id', 'tk-3-block-2',
        'type', 'callout',
        'order', 2,
        'variant', 'takeaway',
        'calloutTone', 'tip',
        'text', 'Course complete! All visual block variants render correctly. All question types work. The recall system triggers. You can now test locking, streaks, fuel, and withdrawal.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object('id', 'tk-3-q1', 'type', 'mcq', 'prompt', 'Did you see a recall question before this lesson?', 'options', jsonb_build_array(
        jsonb_build_object('id', 'tk-3-q1-opt-1', 'text', 'Yes'),
        jsonb_build_object('id', 'tk-3-q1-opt-2', 'text', 'No'),
        jsonb_build_object('id', 'tk-3-q1-opt-3', 'text', 'What''s a recall question?')
      )),
      jsonb_build_object('id', 'tk-3-q2', 'type', 'mcq', 'prompt', 'How many block variants does LockedIn support?', 'options', jsonb_build_array(
        jsonb_build_object('id', 'tk-3-q2-opt-1', 'text', '3'),
        jsonb_build_object('id', 'tk-3-q2-opt-2', 'text', '7'),
        jsonb_build_object('id', 'tk-3-q2-opt-3', 'text', '10')
      ))
    )
  );

  ---------------------------------------------------------------------------
  -- 10. Published module
  ---------------------------------------------------------------------------
  insert into lesson.published_modules (release_id, course_id, module_id, module_order, payload) values
  (
    v_release_id,
    'test-kitchen',
    'test-kitchen-module',
    1,
    jsonb_build_object(
      'id', 'test-kitchen-module',
      'courseId', 'test-kitchen',
      'slug', 'test-kitchen-core',
      'title', 'Test Kitchen Core',
      'description', 'Core module for the Test Kitchen course — testing all LockedIn features.',
      'order', 1,
      'difficulty', 'beginner',
      'totalLessons', 3,
      'estimatedMinutes', 10
    )
  );

  ---------------------------------------------------------------------------
  -- 11. Published lessons
  ---------------------------------------------------------------------------
  insert into lesson.published_lessons (release_id, lesson_id, module_id, lesson_version_id, lesson_order, payload) values
    (v_release_id, 'tk-1', 'test-kitchen-module', v_tk1_version_id, 1, v_tk1_payload),
    (v_release_id, 'tk-2', 'test-kitchen-module', v_tk2_version_id, 2, v_tk2_payload),
    (v_release_id, 'tk-3', 'test-kitchen-module', v_tk3_version_id, 3, v_tk3_payload);

  ---------------------------------------------------------------------------
  -- 12. Published lesson payloads (with content_hash)
  ---------------------------------------------------------------------------
  insert into lesson.published_lesson_payloads (release_id, lesson_id, payload, content_hash) values
    (v_release_id, 'tk-1', v_tk1_payload, md5(v_tk1_payload::text)),
    (v_release_id, 'tk-2', v_tk2_payload, md5(v_tk2_payload::text)),
    (v_release_id, 'tk-3', v_tk3_payload, md5(v_tk3_payload::text));

  raise notice 'Test Kitchen course release complete. Release ID: %', v_release_id;
end;
$seed$;
