import { getContentVersion, listCourseModules, listCourses, listModuleLessons } from '../content/contentApi';
import type { ContentProvider } from './contentProvider';
import type { CourseCatalogSnapshot, ApiLessonPayload } from '../types';
import type { CourseModule } from '@/types';

export class HttpContentProvider implements ContentProvider {
  async loadCatalogSnapshot(): Promise<CourseCatalogSnapshot> {
    const courses = await listCourses();

    const moduleResults = await Promise.allSettled(
      courses.map((course) => listCourseModules(course.id)),
    );
    const modulesByCourse = moduleResults
      .filter((r): r is PromiseFulfilledResult<CourseModule[]> => r.status === 'fulfilled')
      .map(r => r.value);
    const failedModules = moduleResults.filter(r => r.status === 'rejected');
    if (failedModules.length > 0) {
      console.warn(`[content] ${failedModules.length} course module(s) failed to load`);
    }

    const modules = modulesByCourse.flat();

    const lessonResults = await Promise.allSettled(
      modules.map((module) => listModuleLessons(module.id)),
    );
    const lessonsByModule = lessonResults
      .filter((r): r is PromiseFulfilledResult<ApiLessonPayload[]> => r.status === 'fulfilled')
      .map(r => r.value);
    const failedLessons = lessonResults.filter(r => r.status === 'rejected');
    if (failedLessons.length > 0) {
      console.warn(`[content] ${failedLessons.length} module lesson(s) failed to load`);
    }

    const lessons = lessonsByModule.flat();
    const contentVersion = await getContentVersion();

    return {
      courses,
      modules,
      lessons,
      contentVersion,
    };
  }
}
