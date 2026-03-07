create extension if not exists pgcrypto;

do $$
declare
  v_release_id uuid;
  v_sf_module_payload jsonb;
  v_sf1_payload jsonb;
  v_sf2_payload jsonb;
  v_sf1_version_id uuid;
  v_sf2_version_id uuid;
  v_ad1_version_id uuid;
  v_rs1_version_id uuid;
  v_dp1_version_id uuid;
  v_ad1_payload jsonb;
  v_rs1_payload jsonb;
  v_dp1_payload jsonb;
begin
  if exists (
    select 1
    from lesson.publish_releases
    where release_name = 'dev-catalog-expansion-v1'
  ) then
    raise notice 'Seed skipped: dev-catalog-expansion-v1 already exists.';
    return;
  end if;

  select payload
    into v_sf_module_payload
  from lesson.published_modules
  where release_id = (select id from lesson.publish_releases order by created_at desc limit 1)
    and module_id = 'solana-fundamentals-module-core'
  limit 1;

  select payload, lesson_version_id
    into v_sf1_payload, v_sf1_version_id
  from lesson.published_lessons
  where release_id = (select id from lesson.publish_releases order by created_at desc limit 1)
    and lesson_id = 'sf-1'
  limit 1;

  select payload, lesson_version_id
    into v_sf2_payload, v_sf2_version_id
  from lesson.published_lessons
  where release_id = (select id from lesson.publish_releases order by created_at desc limit 1)
    and lesson_id = 'sf-2'
  limit 1;

  if v_sf_module_payload is null or v_sf1_payload is null or v_sf2_payload is null then
    raise exception 'Current solana-fundamentals published payloads not found. Apply prior seeds first.';
  end if;

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
  ) values
  (
    'anchor-dev',
    'anchor-dev',
    'Anchor Development',
    'Build Solana programs using the Anchor framework.',
    'solana',
    'intermediate',
    45,
    25,
    250,
    1,
    30,
    90
  ),
  (
    'rust-solana',
    'rust-solana',
    'Rust for Solana',
    'Learn the Rust fundamentals needed for Solana development.',
    'rust',
    'beginner',
    45,
    10,
    100,
    1,
    10,
    30
  ),
  (
    'defi-protocols',
    'defi-protocols',
    'DeFi Protocols',
    'Understand AMMs, lending, and yield on Solana.',
    'defi',
    'intermediate',
    45,
    25,
    250,
    1,
    30,
    90
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

  insert into lesson.modules (
    id,
    slug,
    title,
    description,
    difficulty,
    estimated_minutes
  ) values
  (
    'anchor-dev-module-core',
    'core',
    'Anchor Development Core',
    'Core module for Anchor Development.',
    'intermediate',
    45
  ),
  (
    'rust-solana-module-core',
    'core',
    'Rust for Solana Core',
    'Core module for Rust for Solana.',
    'beginner',
    45
  ),
  (
    'defi-protocols-module-core',
    'core',
    'DeFi Protocols Core',
    'Core module for DeFi Protocols.',
    'intermediate',
    45
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    difficulty = excluded.difficulty,
    estimated_minutes = excluded.estimated_minutes,
    updated_at = now();

  insert into lesson.course_modules (course_id, module_id, module_order, is_required) values
    ('anchor-dev', 'anchor-dev-module-core', 1, true),
    ('rust-solana', 'rust-solana-module-core', 1, true),
    ('defi-protocols', 'defi-protocols-module-core', 1, true)
  on conflict (course_id, module_id) do update set
    module_order = excluded.module_order,
    is_required = excluded.is_required;

  insert into lesson.lessons (id, slug, title) values
    ('ad-1', 'what-is-anchor', 'What is Anchor?'),
    ('rs-1', 'ownership-and-borrowing', 'Ownership & Borrowing'),
    ('dp-1', 'automated-market-makers', 'Automated Market Makers')
  on conflict (id) do update set
    title = excluded.title,
    updated_at = now();

  insert into lesson.module_lessons (module_id, lesson_id, lesson_order, is_required) values
    ('anchor-dev-module-core', 'ad-1', 1, true),
    ('rust-solana-module-core', 'rs-1', 1, true),
    ('defi-protocols-module-core', 'dp-1', 1, true)
  on conflict (module_id, lesson_id) do update set
    lesson_order = excluded.lesson_order,
    is_required = excluded.is_required;

  insert into lesson.publish_releases (
    release_name,
    notes,
    created_by
  ) values (
    'dev-catalog-expansion-v1',
    'Carries forward Solana Fundamentals and adds Anchor, Rust, and DeFi starter courses.',
    'seed-script'
  )
  returning id into v_release_id;

  insert into lesson.lesson_versions (
    lesson_id,
    version,
    state,
    release_id,
    changelog,
    source_fingerprint,
    created_by,
    published_at
  ) values (
    'ad-1',
    1,
    'published',
    v_release_id,
    'Initial Anchor Development starter lesson.',
    md5('ad-1-v1'),
    'seed-script',
    now()
  )
  returning id into v_ad1_version_id;

  insert into lesson.lesson_versions (
    lesson_id,
    version,
    state,
    release_id,
    changelog,
    source_fingerprint,
    created_by,
    published_at
  ) values (
    'rs-1',
    1,
    'published',
    v_release_id,
    'Initial Rust for Solana starter lesson.',
    md5('rs-1-v1'),
    'seed-script',
    now()
  )
  returning id into v_rs1_version_id;

  insert into lesson.lesson_versions (
    lesson_id,
    version,
    state,
    release_id,
    changelog,
    source_fingerprint,
    created_by,
    published_at
  ) values (
    'dp-1',
    1,
    'published',
    v_release_id,
    'Initial DeFi Protocols starter lesson.',
    md5('dp-1-v1'),
    'seed-script',
    now()
  )
  returning id into v_dp1_version_id;

  insert into lesson.lesson_blocks (lesson_version_id, block_order, block_type, payload) values
  (
    v_ad1_version_id,
    1,
    'paragraph',
    jsonb_build_object(
      'id', 'ad-1-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', 'Anchor is a framework for Solana program development that provides a set of developer tools for writing, testing, and deploying programs. It abstracts away much of the boilerplate required for raw Solana development using the Rust-based Solana SDK.'
    )
  ),
  (
    v_rs1_version_id,
    1,
    'paragraph',
    jsonb_build_object(
      'id', 'rs-1-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', 'Rust''s ownership system is its most distinctive feature. Every value in Rust has a single owner, and when the owner goes out of scope the value is dropped. Borrowing lets you reference a value without taking ownership, and the compiler enforces these rules before your Solana program ever runs.'
    )
  ),
  (
    v_dp1_version_id,
    1,
    'paragraph',
    jsonb_build_object(
      'id', 'dp-1-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', 'Automated Market Makers (AMMs) use liquidity pools and mathematical formulas instead of traditional order books. The classic formula is x * y = k, where swaps move the token balances while preserving the constant product.'
    )
  );

  insert into lesson.questions (
    id,
    lesson_version_id,
    question_order,
    question_type,
    prompt,
    correct_answer,
    metadata
  ) values
  (
    'ad-1-q1',
    v_ad1_version_id,
    1,
    'mcq',
    'What does Anchor use to describe a program''s interface?',
    'IDL (Interface Definition Language)',
    '{}'::jsonb
  ),
  (
    'rs-1-q1',
    v_rs1_version_id,
    1,
    'mcq',
    'How many mutable references to a value can exist at the same time?',
    'One',
    '{}'::jsonb
  ),
  (
    'dp-1-q1',
    v_dp1_version_id,
    1,
    'mcq',
    'What is the constant product formula used by AMMs?',
    'x * y = k',
    '{}'::jsonb
  );

  insert into lesson.question_options (question_id, option_order, option_text) values
    ('ad-1-q1', 1, 'ABI (Application Binary Interface)'),
    ('ad-1-q1', 2, 'IDL (Interface Definition Language)'),
    ('ad-1-q1', 3, 'JSON Schema'),
    ('ad-1-q1', 4, 'Protocol Buffers'),
    ('rs-1-q1', 1, 'Zero'),
    ('rs-1-q1', 2, 'One'),
    ('rs-1-q1', 3, 'Two'),
    ('rs-1-q1', 4, 'Unlimited'),
    ('dp-1-q1', 1, 'x + y = k'),
    ('dp-1-q1', 2, 'x * y = k'),
    ('dp-1-q1', 3, 'x / y = k'),
    ('dp-1-q1', 4, 'x ^ y = k');

  insert into lesson.source_attributions (
    lesson_version_id,
    source_url,
    source_repo,
    source_ref,
    source_license,
    citation_note
  ) values
  (
    v_ad1_version_id,
    'https://www.anchor-lang.com/docs/basics/program-structure',
    'anchor-lang',
    'docs/basics/program-structure',
    'unknown',
    'Starter Anchor lesson adapted for development catalog expansion.'
  ),
  (
    v_rs1_version_id,
    'https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html',
    'rust-lang/book',
    'chapter-4',
    'unknown',
    'Starter Rust lesson adapted for development catalog expansion.'
  ),
  (
    v_dp1_version_id,
    'https://docs.orca.so/whirlpools/overview',
    'orca-so/docs',
    'whirlpools/overview',
    'unknown',
    'Starter DeFi lesson adapted for development catalog expansion.'
  );

  v_ad1_payload := jsonb_build_object(
    'id', 'ad-1',
    'courseId', 'anchor-dev',
    'moduleId', 'anchor-dev-module-core',
    'title', 'What is Anchor?',
    'order', 1,
    'version', 1,
    'releaseId', v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'ad-1-block-1',
        'type', 'paragraph',
        'order', 1,
        'text', 'Anchor is a framework for Solana program development that provides a set of developer tools for writing, testing, and deploying programs. It abstracts away much of the boilerplate required for raw Solana development using the Rust-based Solana SDK.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'ad-1-q1',
        'type', 'mcq',
        'prompt', 'What does Anchor use to describe a program''s interface?',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'ad-1-q1-opt-1', 'text', 'ABI (Application Binary Interface)'),
          jsonb_build_object('id', 'ad-1-q1-opt-2', 'text', 'IDL (Interface Definition Language)'),
          jsonb_build_object('id', 'ad-1-q1-opt-3', 'text', 'JSON Schema'),
          jsonb_build_object('id', 'ad-1-q1-opt-4', 'text', 'Protocol Buffers')
        )
      )
    )
  );

  v_rs1_payload := jsonb_build_object(
    'id', 'rs-1',
    'courseId', 'rust-solana',
    'moduleId', 'rust-solana-module-core',
    'title', 'Ownership & Borrowing',
    'order', 1,
    'version', 1,
    'releaseId', v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'rs-1-block-1',
        'type', 'paragraph',
        'order', 1,
        'text', 'Rust''s ownership system is its most distinctive feature. Every value in Rust has a single owner, and when the owner goes out of scope the value is dropped. Borrowing lets you reference a value without taking ownership, and the compiler enforces these rules before your Solana program ever runs.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'rs-1-q1',
        'type', 'mcq',
        'prompt', 'How many mutable references to a value can exist at the same time?',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'rs-1-q1-opt-1', 'text', 'Zero'),
          jsonb_build_object('id', 'rs-1-q1-opt-2', 'text', 'One'),
          jsonb_build_object('id', 'rs-1-q1-opt-3', 'text', 'Two'),
          jsonb_build_object('id', 'rs-1-q1-opt-4', 'text', 'Unlimited')
        )
      )
    )
  );

  v_dp1_payload := jsonb_build_object(
    'id', 'dp-1',
    'courseId', 'defi-protocols',
    'moduleId', 'defi-protocols-module-core',
    'title', 'Automated Market Makers',
    'order', 1,
    'version', 1,
    'releaseId', v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'dp-1-block-1',
        'type', 'paragraph',
        'order', 1,
        'text', 'Automated Market Makers (AMMs) use liquidity pools and mathematical formulas instead of traditional order books. The classic formula is x * y = k, where swaps move the token balances while preserving the constant product.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'dp-1-q1',
        'type', 'mcq',
        'prompt', 'What is the constant product formula used by AMMs?',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'dp-1-q1-opt-1', 'text', 'x + y = k'),
          jsonb_build_object('id', 'dp-1-q1-opt-2', 'text', 'x * y = k'),
          jsonb_build_object('id', 'dp-1-q1-opt-3', 'text', 'x / y = k'),
          jsonb_build_object('id', 'dp-1-q1-opt-4', 'text', 'x ^ y = k')
        )
      )
    )
  );

  insert into lesson.published_modules (release_id, course_id, module_id, module_order, payload) values
  (
    v_release_id,
    'solana-fundamentals',
    'solana-fundamentals-module-core',
    1,
    v_sf_module_payload
  ),
  (
    v_release_id,
    'anchor-dev',
    'anchor-dev-module-core',
    1,
    jsonb_build_object(
      'id', 'anchor-dev-module-core',
      'courseId', 'anchor-dev',
      'slug', 'core',
      'title', 'Anchor Development Core',
      'description', 'Core module for Anchor Development.',
      'order', 1,
      'difficulty', 'intermediate',
      'totalLessons', 1,
      'estimatedMinutes', 45
    )
  ),
  (
    v_release_id,
    'rust-solana',
    'rust-solana-module-core',
    1,
    jsonb_build_object(
      'id', 'rust-solana-module-core',
      'courseId', 'rust-solana',
      'slug', 'core',
      'title', 'Rust for Solana Core',
      'description', 'Core module for Rust for Solana.',
      'order', 1,
      'difficulty', 'beginner',
      'totalLessons', 1,
      'estimatedMinutes', 45
    )
  ),
  (
    v_release_id,
    'defi-protocols',
    'defi-protocols-module-core',
    1,
    jsonb_build_object(
      'id', 'defi-protocols-module-core',
      'courseId', 'defi-protocols',
      'slug', 'core',
      'title', 'DeFi Protocols Core',
      'description', 'Core module for DeFi Protocols.',
      'order', 1,
      'difficulty', 'intermediate',
      'totalLessons', 1,
      'estimatedMinutes', 45
    )
  );

  insert into lesson.published_lessons (
    release_id,
    lesson_id,
    module_id,
    lesson_version_id,
    lesson_order,
    payload
  ) values
  (
    v_release_id,
    'sf-1',
    'solana-fundamentals-module-core',
    v_sf1_version_id,
    1,
    jsonb_set(v_sf1_payload, '{releaseId}', to_jsonb(v_release_id::text))
  ),
  (
    v_release_id,
    'sf-2',
    'solana-fundamentals-module-core',
    v_sf2_version_id,
    2,
    jsonb_set(v_sf2_payload, '{releaseId}', to_jsonb(v_release_id::text))
  ),
  (
    v_release_id,
    'ad-1',
    'anchor-dev-module-core',
    v_ad1_version_id,
    1,
    v_ad1_payload
  ),
  (
    v_release_id,
    'rs-1',
    'rust-solana-module-core',
    v_rs1_version_id,
    1,
    v_rs1_payload
  ),
  (
    v_release_id,
    'dp-1',
    'defi-protocols-module-core',
    v_dp1_version_id,
    1,
    v_dp1_payload
  );

  insert into lesson.published_lesson_payloads (
    release_id,
    lesson_id,
    payload,
    content_hash
  ) values
  (
    v_release_id,
    'sf-1',
    jsonb_set(v_sf1_payload, '{releaseId}', to_jsonb(v_release_id::text)),
    md5(jsonb_set(v_sf1_payload, '{releaseId}', to_jsonb(v_release_id::text))::text)
  ),
  (
    v_release_id,
    'sf-2',
    jsonb_set(v_sf2_payload, '{releaseId}', to_jsonb(v_release_id::text)),
    md5(jsonb_set(v_sf2_payload, '{releaseId}', to_jsonb(v_release_id::text))::text)
  ),
  (
    v_release_id,
    'ad-1',
    v_ad1_payload,
    md5(v_ad1_payload::text)
  ),
  (
    v_release_id,
    'rs-1',
    v_rs1_payload,
    md5(v_rs1_payload::text)
  ),
  (
    v_release_id,
    'dp-1',
    v_dp1_payload,
    md5(v_dp1_payload::text)
  );

  raise notice 'Catalog expansion release complete. Release ID: %', v_release_id;
end;
$$;
