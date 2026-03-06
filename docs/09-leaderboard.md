# Leaderboard

## What This Is

A ranked display of users competing on learning consistency. Shows streak duration, streak status (ongoing or broken), and supports filtering by current course or all courses. Accessed in the 3D dungeon by tapping the noticeboard object.

## Current State

The leaderboard screen exists but shows a "coming soon" placeholder. The leaderboard store is referenced in the README but not fully implemented. No backend data source exists yet.

## How It Should Work

### Core Rankings
1. Users are ranked primarily by streak duration (consecutive days of completed lessons).
2. Each leaderboard entry shows: rank, user display name (or truncated wallet address), streak count, streak status (ongoing/broken), and optionally their deposit size or yield earned.
3. The ranking algorithm weighs: streak duration as the primary factor. Secondary factors could include total lessons completed, Fuel earned, or deposit size.

### Streak Status
- **Ongoing:** The user is currently on an active streak (completed today or within the allowed window).
- **Broken:** The user's streak has been broken (missed a day with no savers left). They still appear on the leaderboard with their last streak count but are marked as broken.
- The visual difference should be clear — ongoing streaks glow or have an active indicator, broken streaks are dimmed or crossed out.

### Filters
1. **By Course:** Filter the leaderboard to show only users taking the same course as you (e.g., "Solana Fundamentals" leaderboard). This creates smaller, more relevant competition pools.
2. **All Courses:** Show global rankings across all courses. The default view.
3. **Friends:** If a friends system exists, filter to show only friends.
4. **Time Period:** Could filter by: all time, this month, this week.

### Community Pot Display
- The leaderboard screen also shows the community pot status: total pot value, next distribution date, and the user's projected share based on their current rank/streak/deposit.

### Betting on Others (Low Priority / Explore Later)
- The idea of letting users bet on whether another user will maintain their streak.
- This is a social/gamification layer: "I bet user X will keep their 30-day streak going."
- If the streak continues, the bettor wins. If it breaks, they lose.
- This is complex (needs escrow, resolution logic, potential regulatory issues) and should be explored last if at all.

## Where Solana Fits In

- Leaderboard data can be served from a backend database (off-chain) for speed and flexibility. Querying on-chain accounts for rankings would be slow and expensive.
- However, the underlying data (streak counts, deposit sizes, completion records) can be verified on-chain for integrity. The backend aggregates and caches this.
- If betting is implemented, it would need on-chain escrow — users lock SOL or USDC into a bet PDA, and resolution logic releases funds based on streak outcomes. This is essentially a prediction market and is a significant Solana program in itself.
- Community pot distribution is on-chain (vault program handles it), and the leaderboard displays the pot status by reading on-chain state.

## Key Considerations

- Leaderboard needs a backend API — fetching and ranking all users' streak data is a server-side operation.
- Consider privacy: some users may not want their deposit size publicly visible. Make deposit display opt-in or show ranges instead of exact amounts.
- The "betting on others" feature has regulatory implications (gambling/prediction markets). Research jurisdiction requirements before implementing. This should be the last thing built, if at all.
- Leaderboard should update in near-real-time but doesn't need to be instant — a few minutes of lag is acceptable.
- Pagination for large user bases — don't try to render thousands of entries at once.
- Show the current user's rank pinned at the bottom of the screen so they can always see where they stand.

## Related Files

- `src/screens/main/LeaderboardScreen.tsx` — leaderboard UI (currently placeholder)
- `src/stores/streakStore.ts` — streak data that feeds rankings
- `src/services/api/` — where leaderboard API service should live
