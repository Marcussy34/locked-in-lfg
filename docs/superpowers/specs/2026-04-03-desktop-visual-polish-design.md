# Desktop Visual Polish — Design Spec

## Goal

Polish the web app's desktop experience: new Rune-style sidebar with grouped navigation and streak badge, wider multi-column content layout (1100px), remove redundant back buttons, and consistent hover/spacing across all pages.

## Scope

Desktop only (md: 768px+). Mobile layout is unaffected — sidebar stays hidden, bottom nav stays, back buttons stay visible on mobile.

---

## 1. Sidebar — Rune Style + Streak Badge

Replace the current flat sidebar (224px, plain text items) with a Rune-style RPG sidebar.

### Dimensions & Background

- Width: **240px** (up from 224px)
- Background: `linear-gradient(180deg, #09090f 0%, #0c0c16 100%)`
- Right border: `1px solid rgba(212,160,74,0.08)`
- `AppShell.tsx` main content offset updates to `md:ml-[240px]`

### Logo Area

- Text: "LOCKED-IN"
- Style: `font-size: 14px`, `font-weight: bold`, `letter-spacing: 5px`, `text-transform: uppercase`
- Color: CSS gradient text — `linear-gradient(180deg, #D4A04A, #8B6914)` with `background-clip: text`
- Below logo: SVG diamond ornament — two horizontal lines (120px total) with a diamond polygon centered
- Below ornament: **streak badge** pill
  - Background: `rgba(212,160,74,0.10)`
  - Border: `1px solid rgba(212,160,74,0.15)`
  - Border-radius: `12px`
  - Padding: `4px 10px`
  - Content: fire emoji + `{currentStreak} day streak`
  - Font: monospace, 10px, color `#D4A04A`
  - Data source: `useStreakStore((s) => s.currentStreak)` or `useCourseStore` active course streak

### Navigation Groups

Items are split into 3 groups with labels and dividers:

**Learn**
- Courses (`/courses`)
- Dashboard (`/dashboard`)

**Economy**
- Alchemy (`/alchemy`)
- Rewards (`/shop`)

**Social**
- Leaderboard (`/leaderboard`)
- Community (`/community-pot`)
- Profile (`/profile`)

### Group Labels

- Font: monospace, 8px, font-weight bold
- Letter-spacing: 3px, uppercase
- Color: `rgba(212,160,74,0.15)`
- Padding: `16px 20px 6px`

### Group Dividers

- Height: 1px
- Margin: `6px 20px`
- Background: `linear-gradient(90deg, transparent, rgba(212,160,74,0.08), transparent)`

### Nav Items

- Layout: flex, align-items center, gap 12px
- Padding: `10px 20px`
- Font: system-ui sans-serif, 13px
- Transition: `all 0.15s`

**Inactive state:**
- Color: `rgba(255,255,255,0.35)`
- Icon stroke: `rgba(255,255,255,0.25)`

**Hover state:**
- Color: `rgba(255,255,255,0.55)`

**Active state:**
- Color: `#D4A04A`
- Left border: pseudo-element, `position: absolute`, `left: 0`, `top: 0`, `bottom: 0`, `width: 2px`
- Left border background: `linear-gradient(180deg, transparent, #D4A04A, transparent)`
- Background wash: pseudo-element with `linear-gradient(90deg, rgba(212,160,74,0.06) 0%, transparent 60%)`
- Icon stroke: `#D4A04A`
- Text and icon sit above wash via `position: relative; z-index: 1`

### Footer

- Wallet address: centered, monospace 10px
- Color: `rgba(212,160,74,0.18)`
- Border-top: `1px solid rgba(212,160,74,0.06)`
- Padding: `14px 20px`

### File Changes

- **Modify: `web-app/components/Sidebar.tsx`** — Replace entire component with Rune-style implementation
- **Modify: `web-app/components/NavIcons.tsx`** — Update `NAV_ITEMS` to include `group` field ('learn' | 'economy' | 'social')
- **Modify: `web-app/components/AppShell.tsx`** — Update sidebar width offset from `md:ml-56` to `md:ml-[240px]`

---

## 2. Content Layout — Wider + Multi-Column

### ScreenBackground Component

- **Modify: `web-app/components/theme.tsx`**
- Change `max-w-2xl` (672px) to `max-w-[1100px]` in `ScreenBackground`
- Keep `mx-auto` centering and `px-[18px]` padding (adequate at 1100px)

### Per-Page Layout Changes

All layout changes are desktop-only (use `md:` breakpoint prefix).

#### Dashboard (`/dashboard/page.tsx`)
- Stats: change from 3 rows of 2-col to single row of `md:grid-cols-6`
- Cards below stats: `md:grid-cols-2` — flame+fuel in left column, lamps+course in right column

#### Courses (`/courses/page.tsx`)
- Active course card: stays full-width
- Available courses: `md:grid-cols-2` grid for course cards
- Coming soon section: `md:grid-cols-2`

#### Rewards / Shop (`/shop/page.tsx`)
- Earnings breakdown: change from `grid-cols-2` to `md:grid-cols-4`

#### Profile (`/profile/page.tsx`)
- Stats already 4-col — will no longer truncate at 1100px width

#### Leaderboard, Alchemy, Community Pot, Streaks, Inventory
- No structural layout changes needed — wider max-width alone fixes spacing

---

## 3. Back Button Removal (Desktop)

Add `md:hidden` class to `BackButton` component or its usage on every page where it appears.

**Pages affected:**
- Dashboard (`/dashboard/page.tsx`)
- Alchemy (`/alchemy/page.tsx`)
- Rewards (`/shop/page.tsx`)
- Leaderboard (`/leaderboard/page.tsx`)
- Community Pot (`/community-pot/page.tsx`)
- Profile (`/profile/page.tsx`)
- Streaks (`/streaks/page.tsx`)
- Inventory (`/inventory/page.tsx`)

**Approach:** If there's a shared `BackButton` component, add `md:hidden` there once. If pages use inline `← Back` buttons, wrap each in a `md:hidden` container or add the class directly.

---

## 4. General Polish

### Hover States

All clickable cards (ParchmentCard used as buttons, course cards, leaderboard entries) get:
- `hover:border-[rgba(212,160,74,0.18)]`
- `transition-all duration-150`

### Stat Label Truncation

- Add `whitespace-nowrap` to stat labels to prevent mid-word breaks
- Wider layout naturally prevents truncation, but this is a safety net

### Consistent Spacing

- Section gaps: `gap-4` (16px) between cards within a section
- Section margins: `mt-6` (24px) between sections
- Verify consistency across all pages

---

## Verification

1. Resize to desktop (>=768px) — sidebar shows Rune style with grouped nav + streak badge
2. Active page highlighted with vertical amber light bar
3. Content area is 1100px max-width with multi-column grids on dashboard/courses/rewards
4. Back buttons invisible on desktop, visible on mobile
5. Stat labels no longer truncated on any page
6. Hover states on all clickable cards
7. Mobile layout completely unchanged (sidebar hidden, bottom nav visible, back buttons visible)
