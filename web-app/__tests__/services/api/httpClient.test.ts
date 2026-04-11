import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApiError } from '@/services/api/errors';

// Mock config module before importing httpClient
vi.mock('@/services/api/config', () => ({
  getLessonApiBaseUrl: () => 'https://api.test.com',
  getLessonApiFallbackBaseUrls: () => [],
  LESSON_API_TIMEOUT_MS: 15000,
  setLessonApiBaseUrl: vi.fn(),
  hasRemoteLessonApi: () => true,
}));

vi.mock('@/services/api/auth/authApi', () => ({
  refreshAuthSession: vi.fn(),
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: () => ({
      authToken: 'test-access',
      refreshToken: 'test-refresh',
      setAuthSession: vi.fn(),
    }),
  },
}));

describe('httpClient', () => {
  let httpRequest: typeof import('@/services/api/httpClient').httpRequest;

  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ data: 'test' })),
      }),
    );

    const module = await import('@/services/api/httpClient');
    httpRequest = module.httpRequest;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('successful GET returns parsed JSON', async () => {
    const result = await httpRequest<{ data: string }>('/v1/test');

    expect(result).toEqual({ data: 'test' });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/test',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('successful POST sends correct body', async () => {
    const payload = { courseId: 'course-1', amount: 100 };
    await httpRequest('/v1/test', { method: 'POST', body: payload });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
  });

  it('includes Authorization header when token provided', async () => {
    await httpRequest('/v1/test', { token: 'my-token' });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      }),
    );
  });

  it('non-OK response throws ApiError with status', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ message: 'Not found', code: 'NOT_FOUND' })),
    } as Response);

    await expect(httpRequest('/v1/missing')).rejects.toThrow(ApiError);

    const error = await httpRequest('/v1/missing2').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  it('network error is wrapped in ApiError with NETWORK_ERROR code', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed to fetch'));

    await expect(httpRequest('/v1/fail', { method: 'POST' })).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('timeout wraps as ApiError with REQUEST_TIMEOUT code', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    vi.mocked(fetch).mockRejectedValueOnce(abortError);

    await expect(httpRequest('/v1/slow', { method: 'POST' })).rejects.toMatchObject({
      status: 408,
      code: 'REQUEST_TIMEOUT',
    });
  });

  it('handles empty response body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    } as Response);

    const result = await httpRequest('/v1/empty');
    expect(result).toBeNull();
  });

  it('handles non-JSON text response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('plain text response'),
    } as Response);

    const result = await httpRequest('/v1/text');
    expect(result).toBe('plain text response');
  });
});
