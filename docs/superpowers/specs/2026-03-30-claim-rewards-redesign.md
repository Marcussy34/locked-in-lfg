# Claim Rewards Page Redesign

## Context
The current "Ichor Shop" page is visually flat — identical ParchmentCards stacked with no hierarchy, no icons, no visual anchors, and a buried CTA. Ichor is a reward voucher earned through learning, redeemable for USDC. The page needs to reflect redemption framing, not a token swap.

## Design

### Page rename
- "Ichor Shop" → "Claim Rewards"
- Sidebar nav: "Shop" → "Rewards" with a star/gift icon instead of cart emoji
- Subtitle: "Redeem Ichor earned from learning"

### Four zones (top to bottom)

**Zone 1 — Hero Balance**
- Gradient glow background (`rgba(212,160,74,0.12)` → `0.04`)
- Custom potion bottle SVG icon (amber stroke, translucent fill)
- Large balance number in amber
- "Worth approximately $X.XX USDC" in green — instant dollar context
- Tier badge pill: star icon + "Tier 1 · 1,000 = 0.90 USDC"

**Zone 2 — Redeem Card** (primary CTA, visually distinct)
- Bordered card with amber accent border
- Section header: down-arrow SVG + "Redeem Ichor" label
- Amount input field with ICHOR badge
- Preset pills: 250, 500, 1000, All
- Green "You'll receive" preview box showing USDC payout
- Subtext: "Sent directly to your connected wallet"
- Full-width amber "Claim Rewards" button
- Footnote: "On-chain redemption requires wallet connection"

**Zone 3 — Earnings Breakdown**
- 2x2 grid of stat cards (no parchment texture, just dark cards with subtle border)
- Each card: custom SVG icon + monospace label + bold value
  - Total Yield (green up-arrow) → X.XX USDC
  - Fees (minus icon) → X.XX USDC
  - Redirected (double chevron, rust color) → X.XX USDC
  - Ichor Earned (potion icon, amber) → X,XXX
- "X harvests total" centered below

**Zone 4 — Recent Activity**
- Clock SVG + "Recent Activity" section header
- Each entry: icon badge (green up-arrow in rounded square) + "Yield Earned" + relative time + dual amounts (+USDC, +Ichor)
- Compact card layout, no pipeline status details (hide Splitter/LockVault/Pot complexity)

### Icons
All custom inline SVGs — no emoji. Dungeon aesthetic with thin strokes:
- Potion bottle (hero balance)
- Down-arrow (redeem section)
- Hexagon with plus (earnings breakdown)
- Up-arrow (yield stat)
- Minus in square (fees stat)
- Double chevron (redirected stat)
- Small potion (ichor earned stat)
- Clock (recent activity)
- Up-arrow in rounded square badge (activity entries)
- Star (tier badge)

### Language
- "Redeem" not "Exchange" or "Swap"
- "Claim Rewards" not "Exchange Ichor"
- "You'll receive" not "Quote"
- "Worth approximately" on balance
- "Sent directly to your wallet"
- "Earnings Breakdown" not "Harvest Summary"
- "Recent Activity" not "Recent Harvests"
- Activity entries: "Yield Earned" not "MANUAL/SCHEDULED"

### Colors (existing theme tokens)
- Hero glow: `T.amber` with low opacity gradient
- Balance number: `T.amber`
- Dollar value: `T.green`
- Redeem card border: `T.borderAlive`
- Payout preview: green tint background
- Stat icons: green (yield), muted (fees), rust (redirected), amber (ichor)
- Activity badges: green tint background

### Files to modify
- `web-app/app/shop/page.tsx` — full rewrite of JSX and layout
- `web-app/components/Sidebar.tsx` — rename "Shop" → "Rewards", update icon
- No new files needed — all SVGs are inline

### What stays the same
- All data fetching logic (yield history API, token refresh)
- Store subscriptions (courseStore, userStore)
- The disabled state of the redeem button (existing logic)
- Ichor amount state + input handling

## Verification
1. Visual: compare against the approved mockup in `.superpowers/brainstorm/`
2. Data: all yield history values still display correctly
3. Loading/error states still work
4. Sidebar nav updated and links correctly
5. Mobile responsive — single column, no horizontal overflow
