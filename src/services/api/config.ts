const rawBaseUrl = process.env.EXPO_PUBLIC_LESSON_API_BASE_URL ?? '';

export const LESSON_API_BASE_URL = rawBaseUrl.replace(/\/$/, '');
export const LESSON_API_TIMEOUT_MS = 15_000;

export function hasRemoteLessonApi(): boolean {
  return LESSON_API_BASE_URL.length > 0;
}
