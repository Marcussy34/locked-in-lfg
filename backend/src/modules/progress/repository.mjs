import { hasDatabase, query, withTransaction } from '../../lib/db.mjs';

export async function startLessonAttempt(walletAddress, lessonId, startedAt = null) {
  if (!hasDatabase()) {
    return;
  }

  await query(
    `
      insert into lesson.user_lesson_attempts (
        wallet_address,
        lesson_id,
        lesson_version_id,
        started_at
      )
      values (
        $1,
        $2,
        (
          select lv.id
          from lesson.lesson_versions lv
          where lv.lesson_id = $2
            and lv.state = 'published'
          order by lv.published_at desc nulls last
          limit 1
        ),
        coalesce($3::timestamptz, now())
      )
    `,
    [walletAddress, lessonId, startedAt],
  );
}

export async function submitLessonAttempt(walletAddress, lessonId, score, completedAt = null) {
  const timestamp = completedAt ?? new Date().toISOString();

  if (!hasDatabase()) {
    return {
      lessonId,
      accepted: true,
      score,
      completedAt: timestamp,
    };
  }

  return withTransaction(async (tx) => {
    await tx.query(
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
      [walletAddress, lessonId, score, timestamp],
    );

    await tx.query(
      `
        insert into lesson.user_lesson_attempts (
          wallet_address,
          lesson_id,
          lesson_version_id,
          started_at,
          submitted_at,
          score,
          accepted
        )
        values (
          $1,
          $2,
          (
            select lv.id
            from lesson.lesson_versions lv
            where lv.lesson_id = $2
              and lv.state = 'published'
            order by lv.published_at desc nulls last
            limit 1
          ),
          now(),
          $3::timestamptz,
          $4,
          true
        )
      `,
      [walletAddress, lessonId, timestamp, score],
    );

    return {
      lessonId,
      accepted: true,
      score,
      completedAt: timestamp,
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

  const result = await query(
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

  const result = await query(
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
