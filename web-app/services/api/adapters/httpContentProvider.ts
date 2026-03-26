import { getContentVersion, listCourseModules, listCourses, listModuleLessons } from '../content/contentApi';
import type { ContentProvider } from './contentProvider';
import type { CourseCatalogSnapshot } from '../types';

export class HttpContentProvider implements ContentProvider {
  async loadCatalogSnapshot(): Promise<CourseCatalogSnapshot> {
    const courses = await listCourses();

    const modulesByCourse = await Promise.all(
      courses.map(async (course) => {
        const modules = await listCourseModules(course.id);
        return modules;
      }),
    );

    const modules = modulesByCourse.flat();

    const lessonsByModule = await Promise.all(
      modules.map(async (module) => {
        const lessons = await listModuleLessons(module.id);
        return lessons;
      }),
    );

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
