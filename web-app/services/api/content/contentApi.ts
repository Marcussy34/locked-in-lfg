import { httpRequest } from '../httpClient';
import type {
  ApiContentVersion,
  ApiCourseCard,
  ApiLessonPayload,
  ApiModuleCard,
} from '../types';

export function listCourses(): Promise<ApiCourseCard[]> {
  return httpRequest<ApiCourseCard[]>('/v1/courses');
}

export function listCourseModules(courseId: string): Promise<ApiModuleCard[]> {
  return httpRequest<ApiModuleCard[]>(`/v1/courses/${courseId}/modules`);
}

export function listModuleLessons(moduleId: string): Promise<ApiLessonPayload[]> {
  return httpRequest<ApiLessonPayload[]>(`/v1/modules/${moduleId}/lessons`);
}

export function getLesson(lessonId: string): Promise<ApiLessonPayload> {
  return httpRequest<ApiLessonPayload>(`/v1/lessons/${lessonId}`);
}

export function getContentVersion(): Promise<ApiContentVersion> {
  return httpRequest<ApiContentVersion>('/v1/content/version');
}
