import { httpRequest } from '../httpClient';
import type {
  CourseRuntimeSnapshot,
  CourseProgressSnapshot,
  CommunityPotHistoryResponse,
  ModuleProgressSnapshot,
  ProgressStartLessonRequest,
  ProgressStartLessonResponse,
  ProgressSubmitLessonRequest,
  ProgressSubmitLessonResponse,
} from '../types';

export function startLesson(
  lessonId: string,
  payload: ProgressStartLessonRequest,
  token: string,
): Promise<ProgressStartLessonResponse> {
  return httpRequest<ProgressStartLessonResponse>(
    `/v1/progress/lessons/${lessonId}/start`,
    {
    method: 'POST',
    body: payload,
    token,
    },
  );
}

export function submitLesson(
  lessonId: string,
  payload: ProgressSubmitLessonRequest,
  token: string,
): Promise<ProgressSubmitLessonResponse> {
  return httpRequest<ProgressSubmitLessonResponse>(
    `/v1/progress/lessons/${lessonId}/submit`,
    {
      method: 'POST',
      body: payload,
      token,
    },
  );
}

export function getCourseProgress(
  courseId: string,
  token: string,
): Promise<CourseProgressSnapshot> {
  return httpRequest<CourseProgressSnapshot>(`/v1/progress/courses/${courseId}`, {
    token,
  });
}

export function getCourseRuntime(
  courseId: string,
  token: string,
): Promise<CourseRuntimeSnapshot> {
  return httpRequest<CourseRuntimeSnapshot>(
    `/v1/progress/runtime/courses/${courseId}`,
    {
      token,
    },
  );
}

export function getModuleProgress(
  moduleId: string,
  token: string,
): Promise<ModuleProgressSnapshot> {
  return httpRequest<ModuleProgressSnapshot>(`/v1/progress/modules/${moduleId}`, {
    token,
  });
}

export function getCommunityPotHistory(token: string): Promise<CommunityPotHistoryResponse> {
  return httpRequest<CommunityPotHistoryResponse>('/v1/progress/community-pot/history', {
    token,
  });
}
