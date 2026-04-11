import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/api/httpClient', () => ({
  httpRequest: vi.fn(),
}));

import { httpRequest } from '@/services/api/httpClient';
import {
  listCourses,
  listCourseModules,
  listModuleLessons,
  getLesson,
  getContentVersion,
} from '@/services/api/content/contentApi';

describe('contentApi', () => {
  beforeEach(() => {
    vi.mocked(httpRequest).mockReset();
  });

  describe('listCourses', () => {
    it('hits GET /v1/courses', async () => {
      const mockCourses = [{ id: 'course-1', title: 'Solana 101' }];
      vi.mocked(httpRequest).mockResolvedValueOnce(mockCourses);

      const result = await listCourses();

      expect(httpRequest).toHaveBeenCalledWith('/v1/courses');
      expect(result).toEqual(mockCourses);
    });
  });

  describe('listCourseModules', () => {
    it('hits GET /v1/courses/:courseId/modules', async () => {
      const mockModules = [{ id: 'module-1', title: 'Introduction' }];
      vi.mocked(httpRequest).mockResolvedValueOnce(mockModules);

      const result = await listCourseModules('course-1');

      expect(httpRequest).toHaveBeenCalledWith('/v1/courses/course-1/modules');
      expect(result).toEqual(mockModules);
    });
  });

  describe('listModuleLessons', () => {
    it('hits GET /v1/modules/:moduleId/lessons', async () => {
      const mockLessons = [{ id: 'lesson-1', title: 'What is Solana?' }];
      vi.mocked(httpRequest).mockResolvedValueOnce(mockLessons);

      const result = await listModuleLessons('module-1');

      expect(httpRequest).toHaveBeenCalledWith('/v1/modules/module-1/lessons');
      expect(result).toEqual(mockLessons);
    });
  });

  describe('getLesson', () => {
    it('hits GET /v1/lessons/:lessonId', async () => {
      const mockLesson = { id: 'lesson-1', title: 'Solana Basics' };
      vi.mocked(httpRequest).mockResolvedValueOnce(mockLesson);

      const result = await getLesson('lesson-1');

      expect(httpRequest).toHaveBeenCalledWith('/v1/lessons/lesson-1');
      expect(result).toEqual(mockLesson);
    });
  });

  describe('getContentVersion', () => {
    it('returns releaseId and publishedAt', async () => {
      const mockVersion = {
        releaseId: 'release-abc',
        publishedAt: '2024-01-01T00:00:00Z',
      };
      vi.mocked(httpRequest).mockResolvedValueOnce(mockVersion);

      const result = await getContentVersion();

      expect(httpRequest).toHaveBeenCalledWith('/v1/content/version');
      expect(result.releaseId).toBe('release-abc');
      expect(result.publishedAt).toBe('2024-01-01T00:00:00Z');
    });
  });
});
