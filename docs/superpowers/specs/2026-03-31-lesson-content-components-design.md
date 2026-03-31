# Lesson Content Components — Design Spec

## Context
Lesson content currently renders as flat walls of text. The mockups demonstrate 7+ distinct visual patterns that make content engaging and easy to scan. This spec defines the data model (JSONB payload variants) and the React components needed to render them.

## Data Model: Block Variants

Existing `block_type` values stay: `paragraph`, `code`, `callout`, `image`. A new optional `variant` field in the JSONB payload tells the renderer which visual treatment to use. No database schema changes needed.

### Variant Catalog

#### 1. `paragraph` (default — no variant)
Plain body text with headings, bold, inline code, bullets, numbered lists.

#### 2. `callout` variant=`analogy`
Bordered box with lightbulb icon + title. Used for "Village Notebook", "Vending Machine", etc.
```json
{
  "type": "callout",
  "variant": "analogy",
  "title": "The Village Notebook",
  "text": "Imagine a small village...",
  "calloutTone": "info"
}
```

#### 3. `paragraph` variant=`flow`
Numbered vertical flow with connector lines. Used for step-by-step processes.
```json
{
  "type": "paragraph",
  "variant": "flow",
  "text": "...",
  "steps": [
    {"title": "LockedIn builds the instruction", "desc": "Move 50 USDC...", "icon": null},
    {"title": "Your private key signs it", "desc": "Proves it's you", "icon": null},
    {"title": "Solana network validates", "desc": "Valid signature? ✓", "icon": null},
    {"title": "Done in ~0.4 seconds", "desc": "Permanently recorded", "icon": "✓", "color": "green"}
  ]
}
```

#### 4. `paragraph` variant=`concepts`
Icon + title + description rows. Used for "What Lives on Solana" (Accounts, Tokens, Programs, Transactions).
```json
{
  "type": "paragraph",
  "variant": "concepts",
  "text": "Everything on Solana is organized into accounts:",
  "items": [
    {"icon": "📁", "name": "Accounts", "desc": "Every wallet, every token balance..."},
    {"icon": "🪙", "name": "Tokens", "desc": "Digital assets like USDC and SOL..."},
    {"icon": "⚙", "name": "Programs", "desc": "Code deployed to the blockchain..."},
    {"icon": "📝", "name": "Transactions", "desc": "Instructions sent to programs..."}
  ]
}
```

#### 5. `code` variant=`comparison`
Styled comparison table. Used for blockchain comparison, SOL vs USDC, Fuel vs Ichor.
```json
{
  "type": "code",
  "variant": "comparison",
  "text": "",
  "headers": ["", "Fuel", "Ichor"],
  "rows": [
    ["What is it?", "Activity counter", "Reward counter"],
    ["Earned by", "Completing lessons", "Brewing Fuel"],
    ["Worth money?", "No", "Yes — redeemable for USDC"]
  ],
  "highlightRow": null
}
```

#### 6. `paragraph` variant=`chain-cards`
Blockchain comparison cards with brand colors. Used for Bitcoin/Ethereum/Solana comparison.
```json
{
  "type": "paragraph",
  "variant": "chain-cards",
  "text": "",
  "chains": [
    {"name": "Bitcoin", "tagline": "The Freight Train", "desc": "First, most well-known...", "stats": ["~10 min", "$1–$20/tx"], "theme": "btc"},
    {"name": "Ethereum", "tagline": "The Busy Highway", "desc": "Flexible and powerful...", "stats": ["~12 sec", "$5–$50/tx"], "theme": "eth"},
    {"name": "Solana", "tagline": "The Bullet Train", "desc": "Fast, incredibly cheap...", "stats": ["~0.4 sec", "~$0.00025/tx"], "theme": "sol"}
  ]
}
```

#### 7. `callout` variant=`scam`
Scam warning card with fake DM preview. Used for Lesson 7 security scams.
```json
{
  "type": "callout",
  "variant": "scam",
  "calloutTone": "warning",
  "number": 1,
  "title": "Give Me Your Seed Phrase",
  "example": "Hi, we need your seed phrase to fix an issue...",
  "exampleSender": "LockedIn_Support_Official",
  "rule": "No legitimate person will ever ask for your seed phrase."
}
```

#### 8. `paragraph` variant=`checklist`
Green checkbox items. Used for security checklist, recap items.
```json
{
  "type": "paragraph",
  "variant": "checklist",
  "text": "",
  "items": [
    "Never share your private key or seed phrase.",
    "Verify, don't trust. Check URLs carefully.",
    "Start small. Send $1 first.",
    "If it sounds too good to be true, it is.",
    "Read before you sign."
  ]
}
```

#### 9. `callout` variant=`takeaway`
Green-bordered key takeaway box. Used at end of sections.
```json
{
  "type": "callout",
  "variant": "takeaway",
  "calloutTone": "tip",
  "text": "No single person controls the notebook. Math and consensus replace the need for a middleman."
}
```

#### 10. `paragraph` variant=`kv-grid`
2-column stat cards. Used for public key / private key display, SOL vs USDC.
```json
{
  "type": "paragraph",
  "variant": "kv-grid",
  "text": "",
  "items": [
    {"label": "Public Key", "value": "7xKX...q3Fp", "desc": "Like your email address", "color": "default"},
    {"label": "Private Key", "value": "••••••••••••", "desc": "Never share this", "color": "red"}
  ]
}
```

## Frontend Types

Update `web-app/types/lesson.ts`:
```typescript
export interface LessonBlock {
  id: string;
  type: LessonBlockType;
  order: number;
  text?: string;
  language?: string;
  calloutTone?: 'info' | 'warning' | 'tip';
  caption?: string;
  imageUrl?: string;
  // New variant fields
  variant?: string;
  title?: string;
  steps?: Array<{title: string; desc: string; icon?: string | null; color?: string}>;
  items?: Array<any>;  // varies by variant
  chains?: Array<{name: string; tagline: string; desc: string; stats: string[]; theme: string}>;
  headers?: string[];
  rows?: string[][];
  highlightRow?: number | null;
  number?: number;
  example?: string;
  exampleSender?: string;
  rule?: string;
}
```

## Component Structure

New file: `web-app/components/LessonBlocks.tsx`
- `LessonBlockRenderer` — switch on `block.variant ?? block.type`
- `AnalogyBox` — callout variant=analogy
- `FlowSteps` — paragraph variant=flow
- `ConceptList` — paragraph variant=concepts
- `ComparisonTable` — code variant=comparison
- `ChainCards` — paragraph variant=chain-cards
- `ScamCard` — callout variant=scam
- `Checklist` — paragraph variant=checklist
- `TakeawayBox` — callout variant=takeaway
- `KVGrid` — paragraph variant=kv-grid
- `RichParagraph` — default paragraph with headings, bold, lists
- `renderInline` — handles **bold** and `code` formatting

Move rendering logic out of `app/lessons/[id]/page.tsx` into this component file.

## Re-seed

New SQL file: `backend/sql/0025_reseed_course1_rich_blocks.sql`
- Deletes old blocks/payloads for bw-1 through bw-8
- Inserts new blocks with variant-enriched JSONB payloads
- Rebuilds published_lessons and published_lesson_payloads
- Uses same release ID

## Files to modify
- `web-app/types/lesson.ts` — add variant fields to LessonBlock
- `web-app/components/LessonBlocks.tsx` — NEW: all block renderers
- `web-app/app/lessons/[id]/page.tsx` — import from LessonBlocks, remove inline renderers
- `backend/sql/0025_reseed_course1_rich_blocks.sql` — NEW: restructured content
- `web-app/services/repositories/contentRepository.ts` — pass variant fields through

## Verification
1. Run re-seed SQL
2. Restart backend, refresh web-app
3. Open each lesson — verify each section renders with correct visual treatment
4. Navigate through sections (Next/Previous)
5. Complete quiz — verify questions still work
6. Recall question still appears before Lesson 2+
