# Lesson Content Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace flat walls of lesson text with rich visual components (analogy boxes, flow steps, comparison tables, scam cards, checklists, etc.) that match the approved mockups.

**Architecture:** JSONB payload `variant` field on existing block types drives component selection. New `LessonBlocks.tsx` contains all renderers. Content re-seeded in SQL with structured payloads. No database schema changes.

**Tech Stack:** React/TypeScript, Tailwind, existing theme tokens (T.*), PostgreSQL JSONB

---

### Task 1: Update LessonBlock type definition

**Files:**
- Modify: `web-app/types/lesson.ts`

- [ ] **Step 1: Add variant fields to LessonBlock interface**

```typescript
// web-app/types/lesson.ts — replace the LessonBlock interface

export interface FlowStep {
  title: string;
  desc: string;
  icon?: string | null;
  color?: string;
}

export interface ConceptItem {
  icon: string;
  name: string;
  desc: string;
}

export interface ChainCard {
  name: string;
  tagline: string;
  desc: string;
  stats: string[];
  theme: 'btc' | 'eth' | 'sol';
}

export interface KVItem {
  label: string;
  value: string;
  desc?: string;
  color?: 'default' | 'red' | 'green' | 'amber';
}

export type BlockVariant =
  | 'analogy'
  | 'flow'
  | 'concepts'
  | 'comparison'
  | 'chain-cards'
  | 'scam'
  | 'checklist'
  | 'takeaway'
  | 'kv-grid';

export interface LessonBlock {
  id: string;
  type: LessonBlockType;
  order: number;
  text?: string;
  language?: string;
  calloutTone?: 'info' | 'warning' | 'tip';
  caption?: string;
  imageUrl?: string;
  // Variant fields
  variant?: BlockVariant;
  title?: string;
  steps?: FlowStep[];
  items?: (ConceptItem | KVItem | string)[];
  chains?: ChainCard[];
  headers?: string[];
  rows?: string[][];
  highlightRow?: number | null;
  number?: number;
  example?: string;
  exampleSender?: string;
  rule?: string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd web-app && npx tsc --noEmit`
Expected: errors from lesson page referencing old renderer (expected, fixed in Task 3)

- [ ] **Step 3: Commit**

```bash
git add web-app/types/lesson.ts
git commit -m "feat: add variant fields to LessonBlock type for rich content"
```

---

### Task 2: Update content repository mapper

**Files:**
- Modify: `web-app/services/repositories/contentRepository.ts:68-77`

- [ ] **Step 1: Spread all extra payload fields into LessonBlock**

The current `toLesson` mapper only maps known fields. Variant payloads include `variant`, `title`, `steps`, `items`, `chains`, `headers`, `rows`, etc. Spread them through.

```typescript
// In toLesson(), replace the blocks mapping (lines 68-77):
blocks: lesson.blocks.map((block) => ({
  id: block.id,
  type: block.type,
  order: block.order,
  text: block.text,
  language: block.language,
  calloutTone: block.calloutTone,
  caption: block.caption,
  imageUrl: block.imageUrl,
  // Pass through variant fields from JSONB payload
  variant: block.variant,
  title: block.title,
  steps: block.steps,
  items: block.items,
  chains: block.chains,
  headers: block.headers,
  rows: block.rows,
  highlightRow: block.highlightRow,
  number: block.number,
  example: block.example,
  exampleSender: block.exampleSender,
  rule: block.rule,
})),
```

- [ ] **Step 2: Commit**

```bash
git add web-app/services/repositories/contentRepository.ts
git commit -m "feat: pass variant payload fields through content mapper"
```

---

### Task 3: Create LessonBlocks.tsx — all renderers

**Files:**
- Create: `web-app/components/LessonBlocks.tsx`
- Modify: `web-app/app/lessons/[id]/page.tsx` (remove old renderers, import new ones)

- [ ] **Step 1: Create LessonBlocks.tsx**

This file contains all block renderers. Port styles from the approved HTML mockups. Components:

- `renderInline(text)` — handles `**bold**` and `` `code` `` formatting
- `RichParagraph` — default paragraph with heading detection, bullets, numbered lists
- `AnalogyBox` — callout variant=analogy (lightbulb icon, bordered box)
- `FlowSteps` — paragraph variant=flow (numbered vertical flow with connector lines)
- `ConceptList` — paragraph variant=concepts (icon + name + desc rows)
- `ComparisonTable` — code variant=comparison (styled table with optional highlight row)
- `ChainCards` — paragraph variant=chain-cards (colored cards: btc=orange, eth=blue, sol=purple)
- `ScamCard` — callout variant=scam (red card with fake DM preview)
- `Checklist` — paragraph variant=checklist (green checkbox items)
- `TakeawayBox` — callout variant=takeaway (green-bordered key takeaway)
- `KVGrid` — paragraph variant=kv-grid (2-column stat cards)
- `CodeBlock` — code (default, no variant) (amber header bar + dark pre)
- `ImageBlock` — image (rounded with caption)
- `DefaultCallout` — callout (default, no variant) (colored left border)
- `LessonBlockRenderer` — main switch: `block.variant ?? block.type`

The full component code is large. The styles match the HTML mockups at `.superpowers/brainstorm/26977-1774891870/content/lesson-mockups-full.html`. Key theme tokens:

```
T.bg = '#06060C'
T.bgCard = 'rgba(14,14,28,0.88)'
T.amber = '#D4A04A'
T.green = '#3EE68A'
T.crimson = '#FF4466'
T.violet = '#9945FF'
T.textPrimary = '#E8DED0'
T.textSecondary = 'rgba(255,255,255,0.42)'
T.textMuted = 'rgba(255,255,255,0.22)'
T.borderAlive = 'rgba(212,160,74,0.18)'
T.borderDormant = 'rgba(255,255,255,0.06)'
```

Chain card theme colors:
- btc: `#F7931A` (orange)
- eth: `#627EEA` (blue)
- sol: `#9945FF` (purple)

- [ ] **Step 2: Update lesson page — replace inline renderers with import**

In `web-app/app/lessons/[id]/page.tsx`:
1. Add: `import { LessonBlockRenderer } from '@/components/LessonBlocks';`
2. Remove: everything from `/* ── Inline Formatting ──` to end of file (the old `renderInline`, `renderRichText`, `LessonBlockRenderer` functions)
3. The `<LessonBlockRenderer block={currentBlock} />` JSX already exists in the reading phase — it just needs to point to the new import.

- [ ] **Step 3: Verify types compile**

Run: `cd web-app && npx tsc --noEmit`
Expected: PASS (0 errors)

- [ ] **Step 4: Commit**

```bash
git add web-app/components/LessonBlocks.tsx web-app/app/lessons/[id]/page.tsx
git commit -m "feat: rich lesson block renderers (analogy, flow, comparison, scam cards, etc.)"
```

---

### Task 4: Re-seed Course 1 with rich block payloads

**Files:**
- Create: `backend/sql/0025_reseed_course1_rich_blocks.sql`

- [ ] **Step 1: Write the re-seed SQL**

This SQL file:
1. Finds the existing release ID for `course1-blockchain-wallets-v1`
2. Deletes old `lesson_blocks` for all bw-* lesson versions
3. Deletes old `published_lesson_payloads` for bw-* lessons
4. Deletes old `published_lessons` for bw-* lessons
5. Inserts new blocks with variant-enriched JSONB payloads
6. Rebuilds published_lessons and published_lesson_payloads with new block data

Each lesson gets 4-6 blocks using the appropriate variants. Map the original flat content to structured variants:

**Lesson 1 (bw-1): The Problem That Started Everything**
- Block 1: `paragraph` — "Before We Talk Tech" intro (trust, banks, middlemen)
- Block 2: `callout variant=analogy` — "The Village Notebook" with title + body
- Block 3: `paragraph variant=concepts` — notebook=blockchain, page=block, chain=linked, villagers=validators
- Block 4: `callout variant=takeaway` — "Your locked USDC is on a blockchain right now"

**Lesson 2 (bw-2): Solana — The Blockchain Your Money Lives On**
- Block 1: `paragraph variant=chain-cards` — Bitcoin/Ethereum/Solana cards
- Block 2: `callout variant=takeaway` — "Why this matters" (cost comparison)
- Block 3: `paragraph` — Who Runs Solana (validators, Wikipedia analogy)
- Block 4: `paragraph variant=concepts` — Accounts, Tokens, Programs, Transactions
- Block 5: `paragraph variant=kv-grid` — SOL vs USDC comparison

**Lesson 3 (bw-3): Wallets**
- Block 1: `paragraph` — "The Big Reveal" (you have a wallet)
- Block 2: `callout variant=analogy` — "The Locker Analogy"
- Block 3: `paragraph variant=kv-grid` — Public Key vs Private Key
- Block 4: `paragraph variant=flow` — How keys work together (4 steps)

**Lesson 4 (bw-4): Transactions**
- Block 1: `paragraph variant=flow` — Anatomy of your USDC lock transaction
- Block 2: `code variant=comparison` — Fuel vs Ichor table
- Block 3: `callout variant=analogy` — "Gas Fees = Postage Stamp"
- Block 4: `callout variant=takeaway` — Why irreversibility matters

**Lesson 5 (bw-5): Smart Contracts**
- Block 1: `callout variant=analogy` — "The Vending Machine" with embedded flow
- Block 2: `paragraph` — LockedIn smart contract rules
- Block 3: `paragraph variant=concepts` — Smart contracts beyond LockedIn (DEX, Lending, NFTs, LockedIn)
- Block 4: `callout variant=takeaway` — "If LockedIn disappeared" independence message

**Lesson 6 (bw-6): Tokens**
- Block 1: `paragraph variant=concepts` — SOL, USDC, Fuel, Ichor overview
- Block 2: `code variant=comparison` — full 4-item comparison table
- Block 3: `paragraph variant=flow` — The production chain (lessons → Fuel → Ichor → USDC)
- Block 4: `callout variant=takeaway` — Pipeline is automated

**Lesson 7 (bw-7): Security**
- Block 1: `paragraph` — Why scammers love crypto
- Block 2: `callout variant=scam` — Scam #1: Seed phrase theft (with fake DM)
- Block 3: `callout variant=scam` — Scam #2: Phishing + Scam #3: Free money
- Block 4: `paragraph variant=checklist` — The Golden Rules
- Block 5: `callout variant=takeaway` — Google account = wallet security (for now)

**Lesson 8 (bw-8): Self-Custody**
- Block 1: `paragraph` — What you've learned recap
- Block 2: `paragraph variant=kv-grid` — Privy (before) vs Self-custody (after)
- Block 3: `paragraph variant=flow` — How to graduate (6 steps: export, download, import, backup, SOL, connect)
- Block 4: `callout variant=takeaway` — Course complete message

Questions stay unchanged — they're in a separate table and not affected by block changes.

- [ ] **Step 2: Run the re-seed**

```bash
cd backend && node -e "
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const sql = fs.readFileSync('sql/0025_reseed_course1_rich_blocks.sql', 'utf8');
  await pool.query(sql);
  console.log('Re-seed completed!');
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
"
```
Expected: "Re-seed completed!"

- [ ] **Step 3: Verify via API**

```bash
curl -s http://localhost:3001/v1/modules/blockchain-wallets-module-core/lessons | node -e "
const d=[];process.stdin.on('data',c=>d.push(c));process.stdin.on('end',()=>{
  const lessons=JSON.parse(d.join(''));
  lessons.forEach(l=>console.log(l.id, l.blocks?.length+' blocks', l.blocks?.map(b=>b.variant||b.type).join(', ')));
});"
```
Expected: Each lesson shows 4-6 blocks with variant names like `chain-cards`, `flow`, `concepts`, etc.

- [ ] **Step 4: Commit**

```bash
git add backend/sql/0025_reseed_course1_rich_blocks.sql
git commit -m "feat: re-seed Course 1 with rich variant block payloads"
```

---

### Task 5: End-to-end verification

- [ ] **Step 1: Restart backend**

```bash
# Kill and restart backend
cd backend && npm run dev
```

- [ ] **Step 2: Clear stale frontend cache**

Open browser console: `localStorage.clear()` then hard refresh.

- [ ] **Step 3: Walk through Lesson 1**

1. Navigate to `/courses` → click Blockchain & Wallets → open Lesson 1
2. Section 1: should show body text about trust and middlemen
3. Section 2: should show analogy box with "Village Notebook" title
4. Section 3: should show concept list (notebook=blockchain, page=block, etc.)
5. Section 4: should show green takeaway box
6. "Start Questions" → verify quiz works

- [ ] **Step 4: Walk through Lesson 2**

1. Recall question should appear (random from Lesson 1)
2. Section 1: chain cards (Bitcoin orange, Ethereum blue, Solana purple)
3. Section 2: takeaway callout
4. Section 3: body text about validators
5. Section 4: concept list (Accounts, Tokens, Programs, Transactions)
6. Section 5: KV grid (SOL vs USDC)

- [ ] **Step 5: Spot-check Lessons 5 and 7**

- Lesson 5: vending machine analogy box, concept list
- Lesson 7: scam cards with fake DM, checklist with green checkboxes

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: rich lesson content components — 10 block variants with Course 1 content"
git push origin master
```

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `web-app/types/lesson.ts` | Modify | Add variant types to LessonBlock |
| `web-app/services/repositories/contentRepository.ts` | Modify | Pass variant fields through mapper |
| `web-app/components/LessonBlocks.tsx` | Create | All 10+ block variant renderers |
| `web-app/app/lessons/[id]/page.tsx` | Modify | Import new renderers, remove old ones |
| `backend/sql/0025_reseed_course1_rich_blocks.sql` | Create | Restructured lesson content with variants |
