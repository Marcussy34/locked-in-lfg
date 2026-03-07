# Done: 09 Leaderboard

## Scope Completed

This checkpoint replaced the placeholder leaderboard screen with a real off-chain ranking view backed by live lock/runtime state and CommunityPot projection data.

## What Was Implemented

- Backend now serves `/v1/progress/leaderboard`.
- Ranking is computed from:
  - highest live active streak
  - aggregate locked principal
  - active course count
  - recent activity date
- Each row now includes:
  - rank
  - display identity
  - streak status
  - active course count
  - locked principal
  - projected CommunityPot share
- The app now shows:
  - current CommunityPot size
  - next distribution window label
  - signed-in user pinned rank
  - ranked wallet rows

## Main Files

- `backend/src/modules/progress/repository.mjs`
- `backend/src/modules/progress/routes.mjs`
- `src/services/api/types.ts`
- `src/services/api/progress/progressApi.ts`
- `src/screens/main/LeaderboardScreen.tsx`

## Remaining Follow-up

- Materialize ranking snapshots instead of computing on request.
- Add pagination and user-rank pinning outside the first page if the list grows.
- Decide whether exact principal should later move to privacy-safe bands.
