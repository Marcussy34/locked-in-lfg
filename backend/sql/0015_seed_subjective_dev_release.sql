create extension if not exists pgcrypto;

do $$
declare
  v_release_id uuid;
  v_sf1_payload jsonb;
  v_module_payload jsonb;
  v_sf1_version_id uuid;
  v_sf2_version_id uuid;
  v_sf2_payload jsonb;
begin
  if exists (
    select 1
    from lesson.publish_releases
    where release_name = 'dev-subjective-v1'
  ) then
    raise notice 'Seed skipped: dev-subjective-v1 already exists.';
    return;
  end if;

  select payload, lesson_version_id
    into v_sf1_payload, v_sf1_version_id
  from lesson.published_lessons
  where lesson_id = 'sf-1'
  order by release_id desc
  limit 1;

  if v_sf1_payload is null or v_sf1_version_id is null then
    raise exception 'sf-1 published payload not found. Apply prior seed first.';
  end if;

  select payload
    into v_module_payload
  from lesson.published_modules
  where module_id = 'solana-fundamentals-module-core'
  order by release_id desc
  limit 1;

  insert into lesson.lessons (
    id,
    slug,
    title
  ) values (
    'sf-2',
    'pda-basics',
    'Program Derived Addresses'
  )
  on conflict (id) do update set
    title = excluded.title,
    updated_at = now();

  insert into lesson.module_lessons (
    module_id,
    lesson_id,
    lesson_order,
    is_required
  ) values (
    'solana-fundamentals-module-core',
    'sf-2',
    2,
    true
  )
  on conflict (module_id, lesson_id) do update set
    lesson_order = excluded.lesson_order,
    is_required = excluded.is_required;

  insert into lesson.publish_releases (
    release_name,
    notes,
    created_by
  ) values (
    'dev-subjective-v1',
    'Adds a subjective short-text lesson for rubric validator testing.',
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
    'sf-2',
    1,
    'published',
    v_release_id,
    'Initial subjective validator dev lesson.',
    md5('sf-2-v1-subjective'),
    'seed-script',
    now()
  )
  returning id into v_sf2_version_id;

  insert into lesson.lesson_blocks (
    lesson_version_id,
    block_order,
    block_type,
    payload
  ) values (
    v_sf2_version_id,
    1,
    'paragraph',
    jsonb_build_object(
      'id', 'sf-2-block-1',
      'type', 'paragraph',
      'order', 1,
      'text', 'A Program Derived Address (PDA) is a deterministic account address derived from seeds and a program id. PDAs do not have a private key and let programs sign for addresses they control.'
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
  ) values (
    'sf-2-q1',
    v_sf2_version_id,
    1,
    'short_text',
    'What does PDA stand for on Solana?',
    'Program Derived Address',
    jsonb_build_object(
      'validator',
      jsonb_build_object(
        'mode', 'rubric_v1',
        'acceptThreshold', 67,
        'criteria', jsonb_build_array(
          jsonb_build_object(
            'id', 'program',
            'label', 'Mentions Program',
            'kind', 'keywords',
            'keywords', jsonb_build_array('program'),
            'weight', 34,
            'required', true,
            'feedbackPass', 'You identified the Program part correctly.',
            'feedbackMiss', 'Mention that the phrase starts with Program.'
          ),
          jsonb_build_object(
            'id', 'derived',
            'label', 'Mentions Derived',
            'kind', 'keywords',
            'keywords', jsonb_build_array('derived'),
            'weight', 33,
            'required', true,
            'feedbackPass', 'You included the Derived part correctly.',
            'feedbackMiss', 'Include the word Derived in your answer.'
          ),
          jsonb_build_object(
            'id', 'address',
            'label', 'Mentions Address',
            'kind', 'keywords',
            'keywords', jsonb_build_array('address'),
            'weight', 33,
            'required', true,
            'feedbackPass', 'You included the Address part correctly.',
            'feedbackMiss', 'Include the word Address in your answer.'
          )
        )
      )
    )
  );

  insert into lesson.source_attributions (
    lesson_version_id,
    source_url,
    source_repo,
    source_ref,
    source_license,
    citation_note
  ) values (
    v_sf2_version_id,
    'https://solana.com/docs/core/pda',
    'solana.com',
    'docs/core/pda',
    'unknown',
    'Subjective dev lesson derived from Solana PDA docs for local validator testing.'
  );

  v_sf2_payload := jsonb_build_object(
    'id', 'sf-2',
    'courseId', 'solana-fundamentals',
    'moduleId', 'solana-fundamentals-module-core',
    'title', 'Program Derived Addresses',
    'order', 2,
    'version', 1,
    'releaseId', v_release_id::text,
    'blocks', jsonb_build_array(
      jsonb_build_object(
        'id', 'sf-2-block-1',
        'type', 'paragraph',
        'order', 1,
        'text', 'A Program Derived Address (PDA) is a deterministic account address derived from seeds and a program id. PDAs do not have a private key and let programs sign for addresses they control.'
      )
    ),
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'sf-2-q1',
        'type', 'short_text',
        'prompt', 'What does PDA stand for on Solana?'
      )
    )
  );

  insert into lesson.published_modules (
    release_id,
    course_id,
    module_id,
    module_order,
    payload
  ) values (
    v_release_id,
    'solana-fundamentals',
    'solana-fundamentals-module-core',
    1,
    jsonb_set(
      jsonb_set(
        v_module_payload,
        '{totalLessons}',
        '2'::jsonb
      ),
      '{estimatedMinutes}',
      '75'::jsonb
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
    v_sf2_payload
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
    v_sf2_payload,
    md5(v_sf2_payload::text)
  );

  raise notice 'Subjective dev release complete. Release ID: %', v_release_id;
end;
$$;
