import { LESSON_API_BASE_URL, LESSON_API_TIMEOUT_MS } from './config';
import { ApiError } from './errors';

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
}

interface ErrorPayload {
  message?: string;
  code?: string;
}

function joinPath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (!LESSON_API_BASE_URL) {
    throw new Error('Missing EXPO_PUBLIC_LESSON_API_BASE_URL');
  }
  return `${LESSON_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function httpRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LESSON_API_TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(joinPath(path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal ?? controller.signal,
    });

    const text = await response.text();
    const data = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const errorPayload = (data ?? {}) as ErrorPayload;
      throw new ApiError(
        errorPayload.message ?? `Request failed with status ${response.status}`,
        response.status,
        errorPayload.code,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out', 408, 'REQUEST_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
