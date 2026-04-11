const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const API_TIMEOUT_MS = 15_000;

export function hasRemoteLessonApi(): boolean {
  return API_BASE_URL.length > 0;
}

export function getLessonApiBaseUrl(): string {
  return API_BASE_URL;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getLessonApiFallbackBaseUrls(_currentBaseUrl: string): string[] {
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function setLessonApiBaseUrl(_nextBaseUrl: string): void {
  // No-op on web — single API URL
}

export { API_BASE_URL as LESSON_API_BASE_URL, API_TIMEOUT_MS as LESSON_API_TIMEOUT_MS };
