import { badRequest } from '../../lib/errors.mjs';
import { requireAccessAuth } from '../../plugins/auth.mjs';
import {
  getCourseProgress,
  getModuleProgress,
  startLessonAttempt,
  submitLessonAttempt,
} from './repository.mjs';

function assertPathParam(value, fieldName) {
  if (!value || typeof value !== 'string') {
    throw badRequest(`Missing path parameter: ${fieldName}`);
  }
  return value;
}

function assertScore(value) {
  if (!Number.isFinite(value)) {
    throw badRequest('score must be a number', 'INVALID_SCORE');
  }
  if (value < 0 || value > 100) {
    throw badRequest('score must be between 0 and 100', 'INVALID_SCORE_RANGE');
  }
  return Math.round(value);
}

export async function progressRoutes(app) {
  app.post(
    '/v1/progress/lessons/:lessonId/start',
    { preHandler: requireAccessAuth },
    async (request, reply) => {
      const lessonId = assertPathParam(request.params?.lessonId, 'lessonId');
      const startedAt = request.body?.startedAt ?? null;

      await startLessonAttempt(request.auth.walletAddress, lessonId, startedAt);
      reply.status(204).send();
    },
  );

  app.post(
    '/v1/progress/lessons/:lessonId/submit',
    { preHandler: requireAccessAuth },
    async (request) => {
      const lessonId = assertPathParam(request.params?.lessonId, 'lessonId');
      const score = assertScore(request.body?.score);
      const completedAt = request.body?.completedAt ?? null;

      return submitLessonAttempt(
        request.auth.walletAddress,
        lessonId,
        score,
        completedAt,
      );
    },
  );

  app.get(
    '/v1/progress/courses/:courseId',
    { preHandler: requireAccessAuth },
    async (request) => {
      const courseId = assertPathParam(request.params?.courseId, 'courseId');
      return getCourseProgress(request.auth.walletAddress, courseId);
    },
  );

  app.get(
    '/v1/progress/modules/:moduleId',
    { preHandler: requireAccessAuth },
    async (request) => {
      const moduleId = assertPathParam(request.params?.moduleId, 'moduleId');
      return getModuleProgress(request.auth.walletAddress, moduleId);
    },
  );
}
