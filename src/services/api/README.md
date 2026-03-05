# Lesson API Client

This folder uses a modular architecture so lesson modules can scale without rewriting screens.

## Modules

- `content/` fetches catalog and lesson payloads.
- `auth/` handles challenge/verify/refresh contracts.
- `progress/` handles start/submit/progress contracts.
- `adapters/` switches data source (`http` vs `mock`).
- `clientFactory.ts` chooses provider based on `EXPO_PUBLIC_LESSON_API_BASE_URL`.

## Runtime behavior

- When `EXPO_PUBLIC_LESSON_API_BASE_URL` is set, app reads from backend API.
- Otherwise app reads from local mock adapter but with the same DTO shape.

This keeps course/module/lesson screens stable while backend modules are built in parallel.
