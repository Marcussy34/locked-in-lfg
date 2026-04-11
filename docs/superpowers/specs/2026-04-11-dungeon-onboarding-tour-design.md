# Dungeon Onboarding Tour

New users entering the dungeon for the first time see a guided 4-step tour that highlights each interactive object with a white outline and a floating tooltip bubble. Camera stays at the overview angle throughout.

## Decisions

| Decision | Choice |
|----------|--------|
| Outline style | Clean white outline via Babylon.js HighlightLayer |
| Camera behavior | Fixed at overview — no zoom during tour |
| Trigger | Auto on first dungeon load (`!dungeonTourCompleted`) |
| Tour order | Bookshelf → Oil Lamps → Chest → Alchemy Table |
| Tooltip positioning | Engine projects 3D center to screen coords via bridge |
| Implementation | Full engine integration (HighlightLayer + bridge + React overlay) |

## Architecture

Two-layer system coordinated via the existing postMessage bridge:

```
React Layer (Next.js / RN)
├── TourOverlay component
│   ├── Step state (0..3)
│   ├── Tooltip bubble (positioned via screen coords from engine)
│   ├── Dim backdrop (rgba(0,0,0,0.45))
│   └── Skip / Next buttons
│
│  postMessage bridge
│
Dungeon Engine (Babylon.js)
├── HighlightLayer (white inner glow on active meshes)
├── tourHighlight(objectId) → adds meshes + projects center to screen
├── clearHighlight() → removes all meshes from highlight layer
└── Sends tourScreenPos { objectId, x, y } back to React
```

## Tour Steps

| # | ObjectId(s) | Icon | Title | Description |
|---|-------------|------|-------|-------------|
| 1 | `bookshelf` | 📚 | The Bookshelf | Your course library. Tap to browse courses, track progress, and start your next lesson. |
| 2 | `oil_lamp_left`, `oil_lamp_center`, `oil_lamp_right` | 🔥 | The Oil Lamps | Your streak tracker. Complete a lesson daily to keep them burning. After Day 8 you unlock savers. |
| 3 | `old_chest` | 📦 | The Chest | Your inventory. Check fuel balance, Ichor reserves, and saver count at a glance. |
| 4 | `alchemy_table`, `alchemy_yield` | ⚗ | The Alchemy Table | Brew fuel into Ichor. Longer brews yield more per hour. Fuel is earned from lessons. |

## Babylon.js Engine Changes

### New file: `web/dungeon/src/tour/tourHighlight.ts`

**HighlightLayer configuration:**
- `innerGlow: true`, `outerGlow: false` — crisp edge lines, not bloom
- Color: `Color3.White()`
- `blurHorizontalSize: 0.5`, `blurVerticalSize: 0.5` — sharp outline
- Pulse animation: gentle intensity oscillation over 2.4s cycle using `scene.onBeforeRenderObservable`

**Exported functions:**
- `initTourHighlight(scene: Scene, camera: ArcRotateCamera): void` — creates the HighlightLayer (lazy, only called when tour starts)
- `highlightObject(scene: Scene, camera: ArcRotateCamera, objectId: string): void` — finds all meshes for the objectId via `modelRoots` map, adds them to HighlightLayer, projects bounding center to normalized screen coords (0–1), sends `tourScreenPos` via bridge
- `clearHighlight(): void` — removes all meshes from HighlightLayer

**Multi-mesh highlighting:**
- Lamps step: all 3 lamp objectIds (`oil_lamp_left`, `oil_lamp_center`, `oil_lamp_right`) get highlighted simultaneously. Screen position sent for `oil_lamp_center` (the middle one).
- Alchemy step: both `alchemy_table` and `alchemy_yield` highlighted. Screen position sent for `alchemy_table`.

**Screen projection method:**
```typescript
const engine = scene.getEngine();
const width = engine.getRenderWidth();
const height = engine.getRenderHeight();
const screenPos = Vector3.Project(
  center,
  Matrix.Identity(),
  scene.getTransformMatrix(),
  camera.viewport.toGlobal(width, height)
);
// Normalize to 0–1 range
const x = screenPos.x / width;
const y = screenPos.y / height;
```

### Bridge changes: `web/dungeon/src/bridge.ts`

**New incoming messages (parent → dungeon):**
- `tourInit` `{}` — call `initTourHighlight()`
- `tourHighlight` `{ objectId: string }` — call `highlightObject()` for the given objectId. For special steps: if objectId is `oil_lamp_center`, also highlight `oil_lamp_left` and `oil_lamp_right`. If objectId is `alchemy_table`, also highlight `alchemy_yield`.
- `tourClearHighlight` `{}` — call `clearHighlight()`

**New outgoing messages (dungeon → parent):**
- `tourScreenPos` `{ objectId: string, x: number, y: number }` — normalized screen coordinates of the highlighted object's bounding center

### Model root access: `web/dungeon/src/objects/loadModels.ts`

Export the existing `modelRoots` Map so `tourHighlight.ts` can look up mesh groups by objectId:
```typescript
export { modelRoots };  // Map<string, TransformNode>
```

## React Layer: Web (Next.js)

### New file: `web-app/components/TourOverlay.tsx`

**Props:**
```typescript
interface TourOverlayProps {
  onComplete: () => void;
}
```

**Internal state:**
- `step: number` (0–3)
- `screenPos: { x: number, y: number } | null` — updated from `tourScreenPos` bridge messages
- `visible: boolean` — controls mount/unmount animation

**Rendering:**
- Fixed overlay inside DungeonProvider's overlay portal (same z-layer as BookModal, `z-50`)
- Backdrop: `position: fixed; inset: 0; background: rgba(0,0,0,0.45)`
- Single tooltip bubble that repositions based on `screenPos`
- Framer Motion for bubble enter/exit: `initial={{ opacity: 0, y: 10 }}`, `animate={{ opacity: 1, y: 0 }}`, `exit={{ opacity: 0, y: -10 }}`
- Arrow direction: auto-calculated — if object is left of center, arrow points left and bubble renders to the right; vice versa

**Tooltip bubble layout:**
- Step dots (4 dots, active one wider + amber)
- Icon + step label + title header
- Description paragraph
- Skip (ghost button) + Next (amber filled button) row
- Last step: Next button says "Get Started"

**On "Get Started" (final step):**
- Sends `tourClearHighlight` to dungeon
- Calls `onComplete()` which sets `dungeonTourCompleted = true` in userStore

**Theme:** Matches existing Dead Cells aesthetic:
- Background: `rgba(14,14,28,0.96)`
- Border: `rgba(212,160,74,0.35)` (amber)
- Title: Georgia serif, `#F0E6D3`
- Body: system sans-serif, `rgba(240,230,211,0.65)`
- Next button: `#D4A04A` background, `#1A1000` text

### Changes: `web-app/components/DungeonProvider.tsx`

**Tour trigger logic:**
- After receiving `sceneReady` from dungeon iframe, check `!userStore.dungeonTourCompleted`
- If true, wait 1 second, then mount `<TourOverlay onComplete={handleTourComplete} />`
- `handleTourComplete`: sets `dungeonTourCompleted = true` in userStore, unmounts TourOverlay

**Bridge message forwarding:**
- Forward `tourScreenPos` messages from iframe to TourOverlay via a callback or state

## React Layer: Mobile (React Native)

### New file: `src/components/DungeonTour.tsx`

Same logic as web TourOverlay but using React Native APIs:
- `Animated.timing()` for bubble animations (matching existing GuidedTour.tsx patterns)
- Renders via `setTourOverlay()` slot in DungeonProvider (z-index 100)
- Same tooltip content, same step logic
- Uses `StyleSheet.create()` matching existing card styles from GuidedTour

### Changes: `src/components/DungeonProvider.tsx`

Same trigger logic as web:
- After `sceneReady`, check `!dungeonTourCompleted`
- Mount DungeonTour in the tour overlay slot
- Forward `tourScreenPos` bridge messages to DungeonTour

## State Management

**No new Zustand stores.** Tour UI state is ephemeral (local `useState`). Completion uses existing infrastructure:

- `userStore.dungeonTourCompleted` — already exists in both web and mobile stores
- Already persisted via Zustand persist middleware (localStorage on web, AsyncStorage on mobile)
- Set to `true` on tour completion or skip

## Flow Sequence

```
1. User enters dungeon (first time)
2. Dungeon iframe/WebView loads
3. Engine sends sceneReady
4. DungeonProvider checks !dungeonTourCompleted → true
5. Wait 1 second (let scene settle)
6. Mount TourOverlay/DungeonTour
7. Send tourInit to dungeon (creates HighlightLayer)
8. Send tourHighlight { objectId: 'bookshelf' }
9. Engine highlights bookshelf meshes
10. Engine projects center → sends tourScreenPos { x, y }
11. TourOverlay positions bubble at (x, y), shows step 1
12. User taps "Next"
13. Send tourClearHighlight + tourHighlight { objectId: 'oil_lamp_center' }
14. Engine highlights all 3 lamps, sends tourScreenPos
15. TourOverlay shows step 2 at new position
16. ... repeat for steps 3–4 ...
17. User taps "Get Started"
18. Send tourClearHighlight
19. Set dungeonTourCompleted = true
20. Unmount TourOverlay
21. User interacts with dungeon normally
```

## Files Modified

| File | Change |
|------|--------|
| `web/dungeon/src/tour/tourHighlight.ts` | **New** — HighlightLayer setup, highlight/clear functions, screen projection |
| `web/dungeon/src/bridge.ts` | Add tourInit, tourHighlight, tourClearHighlight message handlers |
| `web/dungeon/src/main.ts` | Import tour module, wire bridge handlers |
| `web/dungeon/src/objects/loadModels.ts` | Export `modelRoots` Map |
| `web-app/components/TourOverlay.tsx` | **New** — React tour overlay for web |
| `web-app/components/DungeonProvider.tsx` | Add tour trigger logic + tourScreenPos forwarding |
| `src/components/DungeonTour.tsx` | **New** — React Native tour overlay for mobile |
| `src/components/DungeonProvider.tsx` | Add tour trigger logic + tourScreenPos forwarding |

## Verification

1. **Web:** Run `npm run dev` in `web-app/`, open dungeon page with a fresh user (or clear `dungeonTourCompleted` from localStorage). Tour should auto-start, outline each object in sequence, tooltip should position near the highlighted object.
2. **Mobile:** Run Expo dev client. Same fresh-user test. Tour renders in WebView overlay slot.
3. **Skip behavior:** Tapping "Skip" at any step should dismiss tour, set flag, never show again.
4. **Returning user:** Tour should not appear for users who already completed it.
5. **Outline quality:** White lines should trace actual mesh silhouettes, not bounding boxes. Pulse animation should be smooth.
