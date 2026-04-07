# Desktop Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the desktop experience with a Rune-style sidebar, wider multi-column layout, no redundant back buttons, and consistent hover states.

**Architecture:** Four independent changes: (1) Rune sidebar with grouped nav and streak badge, (2) wider ScreenBackground + per-page multi-column grids, (3) hide BackButton on desktop via `md:hidden`, (4) hover states and stat label truncation fixes. All changes are desktop-only (md: 768px+).

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Zustand stores (streakStore, courseStore)

---

### Task 1: Update NavIcons with group metadata

**Files:**
- Modify: `web-app/components/NavIcons.tsx`

- [ ] **Step 1: Add group field to NAV_ITEMS**

Replace the `NAV_ITEMS` export at `web-app/components/NavIcons.tsx:68-77` with:

```tsx
/** Navigation groups for desktop sidebar */
export type NavGroup = 'learn' | 'economy' | 'social';

/** All nav items with group (used by desktop sidebar) */
export const NAV_ITEMS: { href: string; label: string; icon: (props: { color: string; size?: number }) => ReactNode; group: NavGroup }[] = [
  { href: '/courses', label: 'Courses', icon: IconCourses, group: 'learn' },
  { href: '/dashboard', label: 'Dashboard', icon: IconFlame, group: 'learn' },
  { href: '/alchemy', label: 'Alchemy', icon: IconAlchemy, group: 'economy' },
  { href: '/shop', label: 'Rewards', icon: IconRewards, group: 'economy' },
  { href: '/leaderboard', label: 'Leaderboard', icon: IconLeaderboard, group: 'social' },
  { href: '/community-pot', label: 'Community', icon: IconCommunity, group: 'social' },
  { href: '/profile', label: 'Profile', icon: IconProfile, group: 'social' },
];
```

`BOTTOM_NAV_ITEMS` stays unchanged (no group field needed for mobile).

- [ ] **Step 2: Verify build**

Run: `cd /Users/ongeeshen/Project/locked-in/web-app && npx next build 2>&1 | tail -5`
Expected: Build succeeds. Sidebar.tsx already imports `NAV_ITEMS` — the added `group` field doesn't break existing usage since Sidebar maps over items and only uses `href`, `label`, `icon`.

- [ ] **Step 3: Commit**

```bash
git add web-app/components/NavIcons.tsx
git commit -m "feat: add group metadata to NAV_ITEMS for sidebar grouping"
```

---

### Task 2: Replace Sidebar with Rune style

**Files:**
- Modify: `web-app/components/Sidebar.tsx`

- [ ] **Step 1: Replace entire Sidebar component**

Replace the full contents of `web-app/components/Sidebar.tsx` with:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS, type NavGroup } from './NavIcons';
import { useStreakStore } from '@/stores/streakStore';

const GROUP_LABELS: Record<NavGroup, string> = {
  learn: 'Learn',
  economy: 'Economy',
  social: 'Social',
};

const GROUP_ORDER: NavGroup[] = ['learn', 'economy', 'social'];

export function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, walletAddress } = useAuth();
  const currentStreak = useStreakStore((s) => s.currentStreak);

  if (!isAuthenticated) return null;

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : '';

  // Group items
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    items: NAV_ITEMS.filter((item) => item.group === group),
  }));

  return (
    <nav
      className="fixed left-0 top-0 bottom-0 w-[240px] hidden md:flex flex-col z-20"
      style={{
        background: 'linear-gradient(180deg, #09090f 0%, #0c0c16 100%)',
        borderRight: '1px solid rgba(212,160,74,0.08)',
      }}
    >
      {/* Logo area */}
      <div
        className="flex flex-col items-center px-5 pt-5 pb-4"
        style={{ borderBottom: '1px solid rgba(212,160,74,0.06)' }}
      >
        <Link
          href="/dungeon"
          className="text-[14px] font-bold tracking-[5px] uppercase"
          style={{
            background: 'linear-gradient(180deg, #D4A04A, #8B6914)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          LOCKED-IN
        </Link>

        {/* SVG diamond ornament */}
        <svg width={120} height={12} viewBox="0 0 120 12" className="mt-2">
          <line x1="0" y1="6" x2="50" y2="6" stroke="rgba(212,160,74,0.2)" strokeWidth="1" />
          <polygon points="60,2 64,6 60,10 56,6" fill="rgba(212,160,74,0.3)" />
          <line x1="70" y1="6" x2="120" y2="6" stroke="rgba(212,160,74,0.2)" strokeWidth="1" />
        </svg>

        {/* Streak badge */}
        {currentStreak > 0 && (
          <div
            className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl"
            style={{
              background: 'rgba(212,160,74,0.10)',
              border: '1px solid rgba(212,160,74,0.15)',
            }}
          >
            <span className="text-xs">🔥</span>
            <span
              className="font-mono text-[10px]"
              style={{ color: '#D4A04A' }}
            >
              {currentStreak} day streak
            </span>
          </div>
        )}
      </div>

      {/* Grouped navigation */}
      <div className="flex-1 py-1 overflow-y-auto">
        {grouped.map((section, sectionIdx) => (
          <div key={section.group}>
            {/* Group label */}
            <p
              className="font-mono text-[8px] font-bold uppercase tracking-[3px] px-5 pt-4 pb-1.5"
              style={{ color: 'rgba(212,160,74,0.15)' }}
            >
              {section.label}
            </p>

            {/* Items */}
            {section.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 px-5 py-2.5 text-[13px] relative transition-colors duration-150"
                  style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: isActive ? '#D4A04A' : 'rgba(255,255,255,0.35)',
                  }}
                >
                  {/* Active: vertical amber light bar */}
                  {isActive && (
                    <span
                      className="absolute left-0 top-0 bottom-0 w-[2px]"
                      style={{
                        background: 'linear-gradient(180deg, transparent, #D4A04A, transparent)',
                      }}
                    />
                  )}
                  {/* Active: background wash */}
                  {isActive && (
                    <span
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, rgba(212,160,74,0.06) 0%, transparent 60%)',
                      }}
                    />
                  )}
                  <span className="relative z-[1]">
                    <item.icon
                      color={isActive ? '#D4A04A' : 'rgba(255,255,255,0.25)'}
                      size={20}
                    />
                  </span>
                  <span className="relative z-[1] group-hover:text-[rgba(255,255,255,0.55)] transition-colors duration-150">
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* Divider between groups (not after last) */}
            {sectionIdx < grouped.length - 1 && (
              <div
                className="h-px mx-5 my-1.5"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212,160,74,0.08), transparent)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Wallet address footer */}
      <div
        className="px-5 py-3.5 text-center font-mono text-[10px] tracking-[1px]"
        style={{
          borderTop: '1px solid rgba(212,160,74,0.06)',
          color: 'rgba(212,160,74,0.18)',
        }}
      >
        {shortAddress}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ongeeshen/Project/locked-in/web-app && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web-app/components/Sidebar.tsx
git commit -m "feat: replace sidebar with Rune style — grouped nav, streak badge, diamond ornament"
```

---

### Task 3: Update AppShell sidebar width offset

**Files:**
- Modify: `web-app/components/AppShell.tsx`

- [ ] **Step 1: Change sidebar offset from 56 (224px) to 240px**

In `web-app/components/AppShell.tsx`, find the main element class:

```tsx
<main className={`flex-1 ${isInMainApp ? 'md:ml-56 pb-[72px] md:pb-0' : ''}`}>
```

Replace with:

```tsx
<main className={`flex-1 ${isInMainApp ? 'md:ml-[240px] pb-[72px] md:pb-0' : ''}`}>
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ongeeshen/Project/locked-in/web-app && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web-app/components/AppShell.tsx
git commit -m "fix: update main content offset to match new 240px sidebar width"
```

---

### Task 4: Widen ScreenBackground and courses page

**Files:**
- Modify: `web-app/components/theme.tsx`
- Modify: `web-app/app/courses/page.tsx`

- [ ] **Step 1: Update ScreenBackground max-width**

In `web-app/components/theme.tsx`, find line 41:

```tsx
<div className="relative max-w-2xl mx-auto px-[18px] pb-10">
```

Replace with:

```tsx
<div className="relative max-w-[1100px] mx-auto px-[18px] pb-10">
```

- [ ] **Step 2: Update courses page max-width (custom background)**

In `web-app/app/courses/page.tsx`, find line 267:

```tsx
<div className={`relative max-w-2xl mx-auto px-[18px] ${isOnboardingMode ? 'pb-32' : 'pb-10'}`}>
```

Replace with:

```tsx
<div className={`relative max-w-[1100px] mx-auto px-[18px] ${isOnboardingMode ? 'pb-32' : 'pb-10'}`}>
```

Also find line 452 (the fixed CTA container):

```tsx
<div className="max-w-2xl mx-auto">
```

Replace with:

```tsx
<div className="max-w-[1100px] mx-auto">
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/ongeeshen/Project/locked-in/web-app && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web-app/components/theme.tsx "web-app/app/courses/page.tsx"
git commit -m "feat: widen content area to 1100px max-width for desktop"
```

---

### Task 5: Dashboard multi-column layout

**Files:**
- Modify: `web-app/app/dashboard/page.tsx`

- [ ] **Step 1: Replace stats grid with 6-column on desktop**

In `web-app/app/dashboard/page.tsx`, find the stats grid section (lines 91-104):

```tsx
      {/* Stats grid */}
      <div className="flex flex-col gap-2.5">
        <div className="flex gap-2.5">
          <StatBox label="Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} color={flameColor} />
          <StatBox label="Longest" value={`${longestStreak} day${longestStreak !== 1 ? 's' : ''}`} color={T.amber} />
        </div>
        <div className="flex gap-2.5">
          <StatBox label="Fuel" value={`${fuelBalance}/${fuelCap}`} color={T.rust} />
          <StatBox label="Ichor" value={Math.floor(ichorBalance)} color={T.green} />
        </div>
        <div className="flex gap-2.5">
          <StatBox label="Lessons Done" value={`${totalCompleted}/${totalLessons}`} color={T.violet} />
          <StatBox label="Courses" value={enrolledCount} color={T.teal} />
        </div>
      </div>
```

Replace with:

```tsx
      {/* Stats grid — 2-col on mobile, 6-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <StatBox label="Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} color={flameColor} />
        <StatBox label="Longest" value={`${longestStreak} day${longestStreak !== 1 ? 's' : ''}`} color={T.amber} />
        <StatBox label="Fuel" value={`${fuelBalance}/${fuelCap}`} color={T.rust} />
        <StatBox label="Ichor" value={Math.floor(ichorBalance)} color={T.green} />
        <StatBox label="Lessons" value={`${totalCompleted}/${totalLessons}`} color={T.violet} />
        <StatBox label="Courses" value={enrolledCount} color={T.teal} />
      </div>
```

Note: "Lessons Done" shortened to "Lessons" to fit 6-col layout without truncation.

- [ ] **Step 2: Add 2-column grid for cards on desktop**

Find the section with flame, fuel, lamps, and course cards (lines 107-176). Wrap them in a grid:

Replace:

```tsx
      {/* Flame status */}
      <ParchmentCard className="mt-4 flex items-center gap-4 p-4">
```

With:

```tsx
      {/* Cards — single column on mobile, 2-col on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">

      {/* Flame status */}
      <ParchmentCard className="flex items-center gap-4 p-4">
```

Then after the active course card closing `)}` (before the closing `</ScreenBackground>`), add the closing `</div>`:

Find:

```tsx
      {/* Active course */}
      {activeCourse && (
        <ParchmentCard className="mt-3 p-4 mb-6">
          <SectionLabel>Active Course</SectionLabel>
          <p className="text-[15px] font-bold mt-1" style={{ color: T.textPrimary, fontFamily: 'Georgia, serif' }}>
            {activeCourse.title}
          </p>
          <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
            {activeCourse.completedLessons}/{(lessons[activeCourse.id] ?? []).length || activeCourse.totalLessons} lessons completed
          </p>
        </ParchmentCard>
      )}
    </ScreenBackground>
```

Replace with:

```tsx
      {/* Active course */}
      {activeCourse && (
        <ParchmentCard className="p-4">
          <SectionLabel>Active Course</SectionLabel>
          <p className="text-[15px] font-bold mt-1" style={{ color: T.textPrimary, fontFamily: 'Georgia, serif' }}>
            {activeCourse.title}
          </p>
          <p className="text-[11px] mt-1" style={{ color: T.textSecondary }}>
            {activeCourse.completedLessons}/{(lessons[activeCourse.id] ?? []).length || activeCourse.totalLessons} lessons completed
          </p>
        </ParchmentCard>
      )}
      </div>
    </ScreenBackground>
```

Also remove `mt-3` from the fuel, lamps, and course ParchmentCards since the grid handles spacing:
- `<ParchmentCard className="mt-3 p-4">` → `<ParchmentCard className="p-4">` (fuel progress)
- `<ParchmentCard className="mt-3 p-4">` → `<ParchmentCard className="p-4">` (saver lamps)
- `<ParchmentCard className="mt-3 p-4 mb-6">` → `<ParchmentCard className="p-4">` (active course)

- [ ] **Step 3: Verify build**

Run: `cd /Users/ongeeshen/Project/locked-in/web-app && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web-app/app/dashboard/page.tsx
git commit -m "feat: dashboard desktop layout — 6-col stats, 2-col card grid"
```

---

### Task 6: Courses page multi-column layout

**Files:**
- Modify: `web-app/app/courses/page.tsx`

- [ ] **Step 1: Make available courses 2-col grid on desktop**

In `web-app/app/courses/page.tsx`, find line 399:

```tsx
                  <div className="flex flex-col gap-3">
                    {readyCourses.map((course) => (
```

Replace with:

```tsx
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {readyCourses.map((course) => (
```

- [ ] **Step 2: Make coming soon courses 2-col grid on desktop**

Find line 427:

```tsx
                  <div className="flex flex-col gap-3">
                    {comingSoonCourses.map((course) => (
```

Replace with:

```tsx
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {comingSoonCourses.map((course) => (
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/ongeeshen/Project/locked-in/web-app && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add "web-app/app/courses/page.tsx"
git commit -m "feat: courses page 2-column grid for desktop"
```

---

### Task 7: Shop/Rewards page earnings 4-col grid

**Files:**
- Modify: `web-app/app/shop/page.tsx`

- [ ] **Step 1: Change earnings breakdown to 4-col on desktop**

In `web-app/app/shop/page.tsx`, find line 430:

```tsx
            <div className="grid grid-cols-2 gap-2">
```

Replace with:

```tsx
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/ongeeshen/Project/locked-in/web-app && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web-app/app/shop/page.tsx
git commit -m "feat: rewards earnings breakdown 4-column grid on desktop"
```

---

### Task 8: Hide BackButton on desktop

**Files:**
- Modify: `web-app/components/theme.tsx`

- [ ] **Step 1: Add md:hidden to BackButton component**

In `web-app/components/theme.tsx`, find the BackButton component (lines 83-93):

```tsx
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="py-3 font-mono text-xs"
      style={{ color: T.textSecondary }}
    >
      ← Back
    </button>
  );
}
```

Replace with:

```tsx
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="py-3 font-mono text-xs md:hidden"
      style={{ color: T.textSecondary }}
    >
      ← Back
    </button>
  );
}
```

This hides the back button on all pages at desktop breakpoint. Mobile still shows it. The `lessons/[id]/page.tsx` usage is fine — lessons page is immersive and doesn't have the sidebar, but mobile still needs the back button, and on desktop users can use browser back or navigate via sidebar.

- [ ] **Step 2: Verify build**

Run: `cd /Users/ongeeshen/Project/locked-in/web-app && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add web-app/components/theme.tsx
git commit -m "fix: hide back button on desktop — sidebar handles navigation"
```

---

### Task 9: Stat label truncation fix and hover states

**Files:**
- Modify: `web-app/components/theme.tsx`

- [ ] **Step 1: Add whitespace-nowrap to StatBox label**

In `web-app/components/theme.tsx`, find the StatBox label span (line 168):

```tsx
      <span
        className="font-mono text-[10px] uppercase tracking-[1px]"
        style={{ color: T.textSecondary }}
      >
```

Replace with:

```tsx
      <span
        className="font-mono text-[10px] uppercase tracking-[1px] whitespace-nowrap"
        style={{ color: T.textSecondary }}
      >
```

- [ ] **Step 2: Add hover state to ParchmentCard**

In `web-app/components/theme.tsx`, find the ParchmentCard outer div (line 62):

```tsx
      className={`relative p-4 rounded-[10px] border overflow-hidden ${className}`}
```

Replace with:

```tsx
      className={`relative p-4 rounded-[10px] border overflow-hidden transition-all duration-150 hover:border-[rgba(212,160,74,0.18)] ${className}`}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/ongeeshen/Project/locked-in/web-app && npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web-app/components/theme.tsx
git commit -m "fix: prevent stat label truncation + add hover state to ParchmentCard"
```

---

### Task 10: Clean up mockup files

**Files:**
- Delete: `web-app/public/_mockup-layout.html`
- Delete: `web-app/public/_mockup-sidebar.html`

- [ ] **Step 1: Remove mockup files**

```bash
rm web-app/public/_mockup-layout.html web-app/public/_mockup-sidebar.html
```

- [ ] **Step 2: Commit**

```bash
git add -u web-app/public/_mockup-layout.html web-app/public/_mockup-sidebar.html
git commit -m "chore: remove design mockup HTML files"
```
