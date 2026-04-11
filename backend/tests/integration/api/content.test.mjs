import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer, closeTestServer } from '../../helpers/test-server.mjs';

let app;
beforeAll(async () => { app = await createTestServer(); });
afterAll(async () => { await closeTestServer(app); });

describe('GET /v1/content/version', () => {
  it('returns 200 with release info or 404 if no release', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/content/version',
    });

    // Either 200 with release data or 404 if no release published yet
    expect([200, 404]).toContain(response.statusCode);

    if (response.statusCode === 200) {
      const body = response.json();
      expect(body.releaseId).toBeDefined();
    } else {
      const body = response.json();
      expect(body.code).toBe('NO_RELEASE');
    }
  });
});

describe('GET /v1/courses', () => {
  it('returns 200 with array (may be empty if no release)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/courses',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('GET /v1/courses/:courseId/modules', () => {
  it('returns 200 with array for a valid courseId', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/courses/some-course-id/modules',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

describe('GET /v1/lessons/:lessonId', () => {
  it('returns 404 for nonexistent lesson', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/lessons/nonexistent-lesson-id-12345',
    });

    // Either 404 with LESSON_NOT_FOUND (if release exists) or NO_RELEASE
    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(['LESSON_NOT_FOUND', 'NO_RELEASE']).toContain(body.code);
  });
});
