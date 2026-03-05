import { badRequest, notFound } from '../../lib/errors.mjs';
import {
  getLatestRelease,
  getLessonPayload,
  listCourseModules,
  listCourses,
  listModuleLessons,
} from './repository.mjs';

function assertPathParam(value, fieldName) {
  if (!value || typeof value !== 'string') {
    throw badRequest(`Missing path parameter: ${fieldName}`);
  }
  return value;
}

export async function contentRoutes(app) {
  app.get('/v1/content/version', async () => {
    const latestRelease = await getLatestRelease();
    if (!latestRelease) {
      throw notFound('No published release yet', 'NO_RELEASE');
    }
    return latestRelease;
  });

  app.get('/v1/courses', async () => {
    const latestRelease = await getLatestRelease();
    if (!latestRelease) {
      return [];
    }

    return listCourses(latestRelease.releaseId);
  });

  app.get('/v1/courses/:courseId/modules', async (request) => {
    const courseId = assertPathParam(request.params?.courseId, 'courseId');
    const latestRelease = await getLatestRelease();
    if (!latestRelease) {
      return [];
    }

    return listCourseModules(courseId, latestRelease.releaseId);
  });

  app.get('/v1/modules/:moduleId/lessons', async (request) => {
    const moduleId = assertPathParam(request.params?.moduleId, 'moduleId');
    const latestRelease = await getLatestRelease();
    if (!latestRelease) {
      return [];
    }

    return listModuleLessons(moduleId, latestRelease.releaseId);
  });

  app.get('/v1/lessons/:lessonId', async (request) => {
    const lessonId = assertPathParam(request.params?.lessonId, 'lessonId');
    const latestRelease = await getLatestRelease();
    if (!latestRelease) {
      throw notFound('No published release yet', 'NO_RELEASE');
    }

    const payload = await getLessonPayload(lessonId, latestRelease.releaseId);
    if (!payload) {
      throw notFound('Lesson not found', 'LESSON_NOT_FOUND');
    }

    return payload;
  });
}
