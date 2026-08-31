# Season-wide tips index — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a `/tips` page listing every tip written in the season, grouped by dungeon, where the
dungeon name opens its map and each tip's pull chip jumps the map to the pull that tip is about.

**Architecture:** the page is pure derivation over `getHighlights`, so writing a card raises it
with no code change. The jump is an address — `?focus=44,45` or `?focus=mob` on the codex URL —
read by `DungeonPage`, resolved to map-pixel points, and handed to `DungeonMap`, which knows
nothing of tips or packs. The arithmetic that moves the viewport is a pure function beside
`fitTransform`.

**Tech Stack:** React 19, react-router-dom 7 (HashRouter), TypeScript, Tailwind 4, Vitest 4
(projects `app` and `relay`), Testing Library, Playwright 1.62 (Chromium).

**Spec:** [`2026-08-30-season-tips-index-design.md`](2026-08-30-season-tips-index-design.md)

## Global Constraints

- **English everywhere in code**: comments, commit messages, developer-facing strings. The two
  user-facing dictionaries (`en.ts`, `fr.ts`) are the exception and must change in the same commit.
- **Every new file starts with two `// ABOUTME: ` comment lines** saying what it does.
- **TDD, always**: write the failing test, watch it fail, then implement. No exceptions.
- **Never `--no-verify`**, `--no-hooks`, or `--no-pre-commit-hook` on any git command.
- **Component tests carry `// @vitest-environment jsdom`** as a pragma at the top of the file, and
  declare their own `afterEach(cleanup)` — Testing Library runs without `globals: true`.
- **Mount components through `src/test/render.tsx`** (`renderEn` / `renderFr`), never Testing
  Library's bare `render`: components read the locale from `LocaleProvider`. `renderIn` nests a
  caller's `wrapper` (a `MemoryRouter`, typically) *inside* the provider.
- **Never edit `src/data/generated/*.json`** — it is written by the extraction chain.
- **Nothing under `content/` reaches an MDT string.** This work does not touch the codec.
- Commit style: imperative subject line saying what the commit does to the repository; the body
  explains **why**, not what. No `feat:` / `fix:` prefixes.
- Run `npm test` (both Vitest projects) and `npm run typecheck` before each commit.

## File structure

| File | Responsibility | Task |
| --- | --- | --- |
| `src/components/map/viewport.ts` | **Modify** — add `focusTransform` and `FOCUS_PADDING` beside `fitTransform`. Pure arithmetic. | 1 |
| `src/components/map/viewport.test.ts` | **Modify** — pin the new arithmetic. | 1 |
| `src/lib/tips.ts` | **Modify** — add `tipFocusParam` (write the `?focus=` value) and `parseFocus` (read it back). Both sides of one wire, in one place. | 2 |
| `src/lib/tips.test.ts` | **Modify** — pin both. | 2 |
| `src/components/map/DungeonMap.tsx` | **Modify** — new `focus` prop, focus-aware `fit`, two DOM landmarks. | 3 |
| `src/components/map/DungeonMap.test.tsx` | **Modify** — the prop reaches the canvas. | 3 |
| `src/routes/DungeonPage.tsx` | **Modify** — read `?focus=`, resolve to points, pass to the map. | 4 |
| `src/routes/DungeonPage.test.tsx` | **Modify** — the URL moves the map; a bad value does not. | 4 |
| `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts` | **Modify** — six new keys, both files, one commit. | 5, 7 |
| `src/components/codex/MobTips.tsx` | **Modify** — `PackChip` becomes a `Link`, rendered on every row. | 5 |
| `src/components/codex/MobTips.test.tsx` | **Modify** — every render gains a `MemoryRouter`; two new cases. | 5 |
| `src/lib/tipIndex.ts` | **Create** — `getSeasonTips(locale)`, the season's tips grouped by dungeon. | 6 |
| `src/lib/tipIndex.test.ts` | **Create** — against the real dungeon pool. | 6 |
| `src/components/highlights/TipCard.tsx` | **Create** — the card `TipList` already draws, extracted so the index mounts the same one. | 7 |
| `src/components/highlights/TipList.tsx` | **Modify** — mounts `TipCard`. | 7 |
| `src/routes/TipsIndex.tsx` | **Create** — the page. | 7 |
| `src/routes/TipsIndex.test.tsx` | **Create** — groups, links, empty line. | 7 |
| `src/App.tsx` | **Modify** — the `/tips` route. | 7 |
| `src/routes/Home.tsx` | **Modify** — the header link. | 7 |
| `e2e/tips.spec.ts` | **Modify** — one scenario proving the map actually moves. | 8 |

---

### Task 1: `focusTransform` — the arithmetic that moves the viewport

**Files:**
- Modify: `src/components/map/viewport.ts`
- Test: `src/components/map/viewport.test.ts`

**Interfaces:**
- Consumes: `Transform`, `Size`, `MIN_SCALE`, `MAX_SCALE`, `fitTransform` — all already in this file.
- Produces: `FOCUS_PADDING: number` and
  `focusTransform(points: Point[], size: Size, padding?: number): Transform`. Task 3 calls it.

Background: `viewport.ts` exists because pan and zoom are "the parts of DungeonMap that can be wrong
without anything looking broken". Everything in it is a pure function with a direct unit test and no
DOM. `Point` is `{ x: number; y: number }` from `src/lib/geometry.ts`, already imported there.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/map/viewport.test.ts`. Check the file's existing import line and add
`FOCUS_PADDING` and `focusTransform` to it; `MAX_SCALE` / `MIN_SCALE` may already be imported.

```ts
describe('focusTransform', () => {
  const size = { width: 1000, height: 800 }
  const box = [
    { x: 400, y: 300 },
    { x: 600, y: 500 },
  ]

  it('puts the centre of the points at the centre of the container', () => {
    const t = focusTransform(box, size)
    // The centre of the box is (500, 400) in map pixels.
    expect(500 * t.scale + t.tx).toBeCloseTo(size.width / 2)
    expect(400 * t.scale + t.ty).toBeCloseTo(size.height / 2)
  })

  it('leaves the padding clear on the tighter axis', () => {
    const t = focusTransform(box, size, 100)
    // 200 map pixels wide, into 800 usable: the height is tighter (200 into 600).
    expect(200 * t.scale).toBeLessThanOrEqual(600 + 0.001)
  })

  it('goes as close as the map allows for a single point', () => {
    const t = focusTransform([{ x: 400, y: 300 }], size)
    expect(t.scale).toBe(MAX_SCALE)
  })

  it('does not zoom out past the floor for a box larger than the container', () => {
    const t = focusTransform(
      [
        { x: 0, y: 0 },
        { x: 100_000, y: 100_000 },
      ],
      size,
    )
    expect(t.scale).toBe(MIN_SCALE)
  })

  it('falls back to fitting the whole map when given no points', () => {
    expect(focusTransform([], size)).toEqual(fitTransform(size))
  })
})
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
npx vitest run src/components/map/viewport.test.ts
```

Expected: FAIL — `focusTransform is not a function` (or a TypeScript error that it is not exported).

- [ ] **Step 3: Implement it**

Add to `src/components/map/viewport.ts`, directly below `fitTransform`:

```ts
/** Room left around the focused points, in container pixels, so nothing sits against an edge. */
export const FOCUS_PADDING = 80

/**
 * The transform that brings `points` into view, centred.
 *
 * Given no points it fits the whole map instead of dividing by an empty box: "focus on nothing"
 * is a URL a reader can paste, not a state worth throwing over.
 *
 * A single point makes a zero-wide box, so the division below is `Infinity` rather than `NaN` —
 * `room` is floored at one pixel to keep it so — and the clamp turns that into `MAX_SCALE`, which
 * is what "show me this one" means.
 */
export function focusTransform(points: Point[], size: Size, padding = FOCUS_PADDING): Transform {
  if (!points.length) return fitTransform(size)

  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const min = { x: Math.min(...xs), y: Math.min(...ys) }
  const max = { x: Math.max(...xs), y: Math.max(...ys) }

  const room = {
    width: Math.max(1, size.width - padding * 2),
    height: Math.max(1, size.height - padding * 2),
  }
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, Math.min(room.width / (max.x - min.x), room.height / (max.y - min.y))),
  )

  const centre = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2 }
  return {
    scale,
    tx: size.width / 2 - centre.x * scale,
    ty: size.height / 2 - centre.y * scale,
  }
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npx vitest run src/components/map/viewport.test.ts
```

Expected: PASS, whole file.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
```

```bash
git add src/components/map/viewport.ts src/components/map/viewport.test.ts
git commit -m "Work out where the map has to sit to show a given set of points

The map can only be fitted whole or nudged by hand today, so nothing can
aim it. This is the arithmetic a jump needs, kept beside the rest of the
viewport maths because a transform that is merely off-centre is exactly
the kind of wrong that still looks fine on screen."
```

---

### Task 2: `?focus=` — writing the value and reading it back

**Files:**
- Modify: `src/lib/tips.ts`
- Test: `src/lib/tips.test.ts`

**Interfaces:**
- Consumes: `Tip` (already in this file — a union whose members all carry an optional
  `packs?: number[]`).
- Produces: `type FocusTarget = { packs: number[] } | { mob: true }`,
  `tipFocusParam(tip: Tip): string`, `parseFocus(value: string | null): FocusTarget | null`.
  Task 4 calls `parseFocus`; task 5 calls `tipFocusParam`.

Background: `tips.ts` is a pure module — no glob, no React — which is why it has a direct unit test.
It already holds `tipsSectionId`, a UI-anchor helper, with a comment justifying why the helper lives
beside the parser rather than in a component. These two follow that precedent, and they live
together because they are the two ends of one wire: a change to the format has to break both.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/tips.test.ts`. Add `parseFocus` and `tipFocusParam` to its import from `./tips`.

```ts
describe('tipFocusParam', () => {
  it('lists the pulls a tip names', () => {
    expect(tipFocusParam({ kind: 'text', text: 'x', packs: [44, 45] })).toBe('44,45')
  })

  it('names the mob when the tip is unscoped', () => {
    expect(tipFocusParam({ kind: 'text', text: 'x' })).toBe('mob')
  })
})

describe('parseFocus', () => {
  it('reads a single pull', () => {
    expect(parseFocus('44')).toEqual({ packs: [44] })
  })

  it('reads a combined pull', () => {
    expect(parseFocus('44,45')).toEqual({ packs: [44, 45] })
  })

  it('reads the mob', () => {
    expect(parseFocus('mob')).toEqual({ mob: true })
  })

  it('is null for an absent, empty or unrecognised value', () => {
    expect(parseFocus(null)).toBeNull()
    expect(parseFocus('')).toBeNull()
    expect(parseFocus('pack-44')).toBeNull()
    expect(parseFocus('44,')).toBeNull()
    expect(parseFocus('0')).toBeNull()
    expect(parseFocus('-3')).toBeNull()
  })

  it('round-trips what tipFocusParam writes', () => {
    expect(parseFocus(tipFocusParam({ kind: 'text', text: 'x', packs: [44] }))).toEqual({ packs: [44] })
    expect(parseFocus(tipFocusParam({ kind: 'text', text: 'x' }))).toEqual({ mob: true })
  })
})
```

- [ ] **Step 2: Run the tests and watch them fail**

```bash
npx vitest run src/lib/tips.test.ts
```

Expected: FAIL — `parseFocus is not a function`.

- [ ] **Step 3: Implement them**

Add to `src/lib/tips.ts`, below `tipsSectionId`:

```ts
/** What a `?focus=` value names: the pulls a tip is about, or the mob it is written on. */
export type FocusTarget = { packs: number[] } | { mob: true }

/**
 * The `?focus=` value for a tip.
 *
 * A tip that names no pull falls back to the mob rather than to nothing: the reader asked to be
 * shown something, and every clone of the mob is the honest answer when the card gave no narrower
 * one.
 */
export const tipFocusParam = (tip: Tip): string => (tip.packs?.length ? tip.packs.join(',') : 'mob')

/**
 * Reading `?focus=` back off the URL.
 *
 * Anything unrecognised is null, and the map then stays where it is. A pasted URL carrying a typo
 * should neither throw nor aim somewhere arbitrary — the same posture as a mob with no card still
 * rendering. `parts.length` is compared rather than filtered so that `44,` and `44,x` are rejected
 * whole instead of silently becoming `[44]`.
 */
export function parseFocus(value: string | null): FocusTarget | null {
  if (!value) return null
  if (value === 'mob') return { mob: true }
  const parts = value.split(',')
  const packs = parts.map(Number).filter((n) => Number.isInteger(n) && n > 0)
  return packs.length === parts.length ? { packs } : null
}
```

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npx vitest run src/lib/tips.test.ts
```

Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
```

```bash
git add src/lib/tips.ts src/lib/tips.test.ts
git commit -m "Give a tip's scope a form a URL can carry

A jump that lived in router state would not survive a reload and could
not be pasted to anyone, which would make it the one thing in this app
that is not an address. Both ends of the wire sit in one module so that
changing the format cannot break only half of it."
```

---

### Task 3: the map accepts a focus

**Files:**
- Modify: `src/components/map/DungeonMap.tsx`
- Test: `src/components/map/DungeonMap.test.tsx`

**Interfaces:**
- Consumes: `focusTransform`, `FOCUS_PADDING` from task 1.
- Produces: `export interface MapFocus { points: Point[]; token: string }`, and a new optional prop
  `focus?: MapFocus | null` on `DungeonMap`. Task 4 supplies it. Also two DOM landmarks:
  `data-map-viewport` on the outer container and `data-map-canvas` on the transformed div.

Background, and the trap to avoid: `fit` currently resets the transform to the whole-map fit, and it
is called from three places — a layout effect on mount and on `slug`, a `ResizeObserver`, and
nothing else. A separate focus effect would race the observer, whose first callback fires after
mount and would undo the focus. So `fit` itself becomes focus-aware: one function decides the
transform, and every refit — mount, resize, focus change — lands on the same answer.

The focus is read through a ref inside `fit` so that `fit`'s identity stays stable. That matters:
`DungeonPage` re-renders on every hover, and a `fit` that changed identity each time would drag the
`ResizeObserver` effect with it and snap the map back while the reader was panning. The refit is
triggered by the *token* instead, which changes once per navigation.

The two landmarks are the same kind of thing as `data-pull` and `data-clone` already in this file:
`data-map-viewport` is the visible area, `data-map-canvas` is the thing that moves. Reaching them by
Tailwind class would be a selector that breaks on a restyle.

- [ ] **Step 1: Write the failing test**

Append to `src/components/map/DungeonMap.test.tsx`. Reuse whatever `lookup` / props helper the file
already uses for a bare map; the assertion below only needs the canvas.

```ts
describe('Focus', () => {
  it('sits at the plain fit when nothing asks for a focus', () => {
    const { container } = renderEn(<DungeonMap slug={SLUG} lookup={lookup} />)
    const canvas = container.querySelector('[data-map-canvas]') as HTMLElement
    // jsdom lays out at zero, so fitTransform's scale is 0 here. That is the point: it is a
    // value focusTransform cannot produce, so the two are distinguishable without a layout.
    expect(canvas.style.transform).toContain('scale(0)')
  })

  it('applies a focus instead of fitting the whole map', () => {
    const { container } = renderEn(
      <DungeonMap
        slug={SLUG}
        lookup={lookup}
        focus={{ points: [{ x: 400, y: 300 }], token: 'a' }}
      />,
    )
    const canvas = container.querySelector('[data-map-canvas]') as HTMLElement
    expect(canvas.style.transform).not.toContain('scale(0)')
  })
})
```

Note honestly in the file what this proves: the prop reaches the arithmetic and changes the result.
It cannot prove the map is *usefully* placed, because jsdom's container is 0×0 — task 8 does that.

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run src/components/map/DungeonMap.test.tsx -t Focus
```

Expected: FAIL — `[data-map-canvas]` does not exist, so `canvas` is null.

- [ ] **Step 3: Implement it**

In `src/components/map/DungeonMap.tsx`:

Add `focusTransform` to the existing import from `./viewport`.

Add the exported interface beside `PullMark` and `PullShape`:

```ts
/**
 * Where the map should sit, and a token that changes every time the reader asks again.
 *
 * The token is what makes a second click on the same target work: the points would be equal, and
 * re-applying an effect that has not changed is not something React does. Same reasoning as
 * `flashToken` in `MobTips`.
 */
export interface MapFocus {
  points: Point[]
  token: string
}
```

Add to `Props`:

```ts
  /** Bring these map-pixel points into view instead of fitting the whole map. */
  focus?: MapFocus | null
```

Add `focus` to the destructured parameter list.

Replace the `fit` callback and its layout effect with:

```ts
  /**
   * Read through a ref rather than closed over, so `fit` keeps one identity for the life of the
   * component. The `ResizeObserver` effect below depends on `fit`; a `fit` that changed on every
   * render of the parent would tear that observer down and rebuild it constantly, and refit the
   * map out from under a reader mid-pan.
   */
  const focusRef = useRef(focus)
  focusRef.current = focus

  const fit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const size = { width: el.clientWidth, height: el.clientHeight }
    const wanted = focusRef.current
    setTransform(wanted?.points.length ? focusTransform(wanted.points, size) : fitTransform(size))
  }, [])

  useLayoutEffect(fit, [fit, slug, focus?.token])
```

Add `data-map-viewport` to the outer container div (the one carrying `onPointerDown`), and
`data-map-canvas` to the transformed div (`className="absolute top-0 left-0 origin-top-left"`).

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npx vitest run src/components/map/DungeonMap.test.tsx
```

Expected: PASS, whole file — the existing cases must stay green.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
```

```bash
git add src/components/map/DungeonMap.tsx src/components/map/DungeonMap.test.tsx
git commit -m "Let something outside the map decide where it looks

Fitting is now one decision rather than two competing ones: a separate
focus effect would have raced the resize observer, whose first callback
lands after mount and would have undone the focus every time. The map
still knows nothing about tips or packs — it is handed points."
```

---

### Task 4: the URL moves the map

**Files:**
- Modify: `src/routes/DungeonPage.tsx`
- Test: `src/routes/DungeonPage.test.tsx`

**Interfaces:**
- Consumes: `parseFocus` (task 2), `MapFocus` (task 3).
- Produces: nothing new. `/d/<slug>/codex/mob/<npcId>?focus=44` now moves the map.

Background: `DungeonPage` already imports `useLocation`, `useSearchParams` and `toPixels`, and
already reads `#spell-<id>` off the hash — this is the same split, kept in the route rather than in
a panel. `lookup.packs` is a `Map<number, Pack>`, and a `Pack` carries `hull: {x,y}[]` already in
map pixels (built with `toPixels` in `data.ts`), so a pack needs no conversion. A mob's clones do:
`toPixels(clone.x, clone.y)`.

`useLocation().key` is React Router's per-history-entry id. It changes even when the path does not,
which is exactly what a second click on the same chip needs.

- [ ] **Step 1: Write the failing tests**

Append to `src/routes/DungeonPage.test.tsx`, following the file's existing pattern for rendering the
page at a given route (it already mounts through a router with an initial entry — reuse that
helper). The Blinding Vale's Sporeblight Belcher is npc `254850`; pack `44` exists in that dungeon.

```ts
describe('Focusing the map from the URL', () => {
  it('moves the map when the URL names a pull', () => {
    const { container } = renderAt('/d/the-blinding-vale/codex/mob/254850?focus=44')
    const canvas = container.querySelector('[data-map-canvas]') as HTMLElement
    expect(canvas.style.transform).not.toContain('scale(0)')
  })

  it('moves the map when the URL names the mob', () => {
    const { container } = renderAt('/d/the-blinding-vale/codex/mob/254850?focus=mob')
    const canvas = container.querySelector('[data-map-canvas]') as HTMLElement
    expect(canvas.style.transform).not.toContain('scale(0)')
  })

  it('leaves the map alone for a value it cannot read', () => {
    const { container } = renderAt('/d/the-blinding-vale/codex/mob/254850?focus=pack-44')
    const canvas = container.querySelector('[data-map-canvas]') as HTMLElement
    expect(canvas.style.transform).toContain('scale(0)')
  })

  it('leaves the map alone for a pull the dungeon does not have', () => {
    const { container } = renderAt('/d/the-blinding-vale/codex/mob/254850?focus=99999')
    const canvas = container.querySelector('[data-map-canvas]') as HTMLElement
    expect(canvas.style.transform).toContain('scale(0)')
  })
})
```

If the file has no `renderAt` helper, write one at the top of the new describe block:

```ts
const renderAt = (path: string) =>
  renderEn(<App />, {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
  })
```

using `App` from `../App` and `MemoryRouter` from `react-router-dom`, and matching however the
file already stubs `ResizeObserver` and `scrollIntoView` — both are needed to mount this page.

- [ ] **Step 2: Run the tests and watch them fail**

```bash
npx vitest run src/routes/DungeonPage.test.tsx -t "Focusing the map"
```

Expected: FAIL — the first two cases find `scale(0)`, because nothing reads `?focus=` yet.

- [ ] **Step 3: Implement it**

In `src/routes/DungeonPage.tsx`:

Add `parseFocus` to the import from `../lib/tips` (create the import if the file has none), and
`type MapFocus` to the import from `../components/map/DungeonMap`.

The page already calls `useLocation()` for the hash — destructure `key` from it as well:

```ts
  const { hash, key } = useLocation()
```

Below `selectedMob`, add:

```ts
  /**
   * Where a jump wants the map, resolved from `?focus=`.
   *
   * A pull is resolved through its hull, which `data.ts` already computed in map pixels; a mob
   * through its own clones, which are still in MDT coordinates. Resolving to nothing — an unknown
   * pull, or `mob` with no mob in the path — yields null and the map stays fitted, rather than
   * aiming at an empty box.
   *
   * `key` is the token: it changes on every navigation, including one to the identical URL, so
   * clicking the same chip twice moves the map twice.
   */
  const focusParam = searchParams.get('focus')
  const focus = useMemo<MapFocus | null>(() => {
    const target = parseFocus(focusParam)
    if (!target) return null

    const points =
      'mob' in target
        ? selectedMob == null
          ? []
          : lookup.dungeon.enemies
              .filter((e) => e.id === selectedMob)
              .flatMap((e) => e.clones.map((c) => toPixels(c.x, c.y)))
        : target.packs.flatMap((g) => lookup.packs.get(g)?.hull ?? [])

    return points.length ? { points, token: key } : null
  }, [focusParam, selectedMob, lookup, key])
```

Pass it to the map, beside the props it already receives:

```tsx
            focus={focus}
```

If `searchParams` is not already in scope on this component, take it from the existing
`useSearchParams()` call — the page already uses it for `room` and `route`.

- [ ] **Step 4: Run the tests and watch them pass**

```bash
npx vitest run src/routes/DungeonPage.test.tsx
```

Expected: PASS, whole file.

- [ ] **Step 5: Typecheck, run everything, commit**

```bash
npm run typecheck
```

```bash
npm test
```

```bash
git add src/routes/DungeonPage.tsx src/routes/DungeonPage.test.tsx
git commit -m "Aim the map from the address bar

A pull is resolved through the hull the data already carries and a mob
through its clones, so the map itself stays ignorant of both. A value it
cannot read leaves the map where it was: a pasted link with a typo
should not throw, and should not aim somewhere arbitrary either."
```

---

### Task 5: the pull chip becomes the jump

**Files:**
- Modify: `src/components/codex/MobTips.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`
- Test: `src/components/codex/MobTips.test.tsx`

**Interfaces:**
- Consumes: `tipFocusParam` (task 2), and the `?focus=` handling from task 4.
- Produces: every tip row now carries a link to `/d/<slug>/codex/mob/<npcId>?focus=<value>`.

Background, and the cost the spec records: `MobTips.test.tsx` renders bare today, with no router.
A `Link` inside `MobTips` makes **every** render in that file throw. Each one must be wrapped.
`renderIn` in `src/test/render.tsx` already nests a caller's `wrapper` inside the locale provider
for exactly this, so the change is mechanical — but it touches the whole file and is part of this
task, not a separate one.

`PackChip` currently renders only when a tip names packs. It now renders on every row, so the rows
do not go ragged and every tip carries one control.

- [ ] **Step 1: Add the interface strings, both languages**

In `src/lib/i18n/en.ts`, beside the existing `'tip.pack'` / `'tip.packs'` keys:

```ts
  'tip.anywhere': 'Wherever it stands',
  'tip.showOnMap': 'Show on the map',
```

In `src/lib/i18n/fr.ts`, at the matching place:

```ts
  'tip.anywhere': 'Où qu\'il soit',
  'tip.showOnMap': 'Voir sur la carte',
```

Do not touch `'tip.jump'` — it already means the badge on a codex card that scrolls to the tips
section, and reusing it would make two different controls share one string.

- [ ] **Step 2: Write the failing tests**

At the top of `src/components/codex/MobTips.test.tsx`, add a router-aware helper and use it for
**every** existing render in the file (replace `renderEn(` / `renderFr(` call sites):

```tsx
import { MemoryRouter } from 'react-router-dom'

/** MobTips links to the map, so every render in this file needs a router around it. */
const inRouter = { wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter> }
```

so a call reads `renderEn(<MobTips … />, inRouter)`. Import `ReactNode` as a type from `react`.

Then add the new cases:

```tsx
describe('The jump to the map', () => {
  it('names the pull a scoped tip is about, and links to it', () => {
    renderEn(
      <MobTips slug={SLUG} npcId={NPC_ID} tips={[{ ...text, packs: [44] }]} fallback={false} />,
      inRouter,
    )
    const link = screen.getByRole('link', { name: /Pack 44/ })
    expect(link).toHaveAttribute('href', `/d/${SLUG}/codex/mob/${NPC_ID}?focus=44`)
  })

  it('joins a combined pull', () => {
    renderEn(
      <MobTips slug={SLUG} npcId={NPC_ID} tips={[{ ...text, packs: [44, 45] }]} fallback={false} />,
      inRouter,
    )
    expect(screen.getByRole('link', { name: /44 \+ 45/ })).toHaveAttribute(
      'href',
      `/d/${SLUG}/codex/mob/${NPC_ID}?focus=44,45`,
    )
  })

  it('falls back to the mob when the tip names no pull', () => {
    renderEn(<MobTips slug={SLUG} npcId={NPC_ID} tips={[text]} fallback={false} />, inRouter)
    expect(screen.getByRole('link', { name: /Wherever it stands/ })).toHaveAttribute(
      'href',
      `/d/${SLUG}/codex/mob/${NPC_ID}?focus=mob`,
    )
  })

  it('gives every row a control, whatever its kind', () => {
    renderEn(
      <MobTips slug={SLUG} npcId={NPC_ID} tips={[text, video, image]} fallback={false} />,
      inRouter,
    )
    // Three rows, three chips — plus the video's own "Open on YouTube" link.
    expect(screen.getAllByRole('link', { name: /Wherever it stands/ })).toHaveLength(3)
  })
})
```

- [ ] **Step 3: Run the tests and watch them fail**

```bash
npx vitest run src/components/codex/MobTips.test.tsx
```

Expected: FAIL — no link is found, because `PackChip` is a `<span>` and renders only for scoped tips.

- [ ] **Step 4: Implement it**

In `src/components/codex/MobTips.tsx`:

Add the imports:

```ts
import { Link } from 'react-router-dom'
```

and add `tipFocusParam` to the existing import from `../../lib/tips`.

Replace the chip's call site in the row — it currently reads
`{tip.packs?.length ? <PackChip packs={tip.packs} /> : null}` — with:

```tsx
            <PackChip slug={slug} npcId={npcId} tip={tip} />
```

Replace `PackChip` itself:

```tsx
/**
 * Which pull a tip is about, and the way to go and look at it.
 *
 * It sits on the row rather than in the section heading because one card's tips can be about
 * different pulls — a mob standing in eleven packs can earn a sentence about two of them.
 *
 * The control that names the pull is the control that takes you there; a separate button beside it
 * would be a second thing naming the same pull. An unscoped tip gets the same chip shaped for the
 * mob, so no row is left without one.
 */
function PackChip({ slug, npcId, tip }: { slug: string; npcId: number; tip: Tip }) {
  const { t } = useI18n()
  const label = !tip.packs?.length
    ? t('tip.anywhere')
    : tip.packs.length === 1
      ? t('tip.pack', { g: tip.packs[0] })
      : t('tip.packs', { list: tip.packs.join(' + ') })

  return (
    <Link
      to={`/d/${slug}/codex/mob/${npcId}?focus=${tipFocusParam(tip)}`}
      title={t('tip.showOnMap')}
      className="mb-1 inline-block rounded border border-ink-600 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-ink-400 transition hover:border-gold-400 hover:text-gold-400"
    >
      {label} <span aria-hidden="true">→</span>
    </Link>
  )
}
```

- [ ] **Step 5: Run the tests and watch them pass**

```bash
npx vitest run src/components/codex/MobTips.test.tsx
```

Expected: PASS, whole file — including every case you wrapped in step 2.

- [ ] **Step 6: Run the suites that mount MobTips**

```bash
npm test
```

Expected: PASS. `TipList.test.tsx`, `MobCard.test.tsx`, `CodexPanel.test.tsx` and
`HighlightsPage.test.tsx` all mount `MobTips` transitively; any of them rendering without a router
will fail here and needs the same wrapper.

- [ ] **Step 7: Typecheck and commit**

```bash
npm run typecheck
```

```bash
git add src/components/codex/MobTips.tsx src/components/codex/MobTips.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "Make the chip that names a pull the way to go and see it

A separate button beside it would have been a second control naming the
same thing. Because one component renders every tip row, the codex card
and the briefing gain this in the same breath as the index that has yet
to be written."
```

---

### Task 6: the season's tips, grouped

**Files:**
- Create: `src/lib/tipIndex.ts`
- Test: `src/lib/tipIndex.test.ts`

**Interfaces:**
- Consumes: `dungeonList` from `./data`, `getHighlights` and `HighlightTip` from `./highlights`,
  `Locale` / `DEFAULT_LOCALE` from `./i18n/locales`.
- Produces: `export interface DungeonTips { slug: string; name: string; tips: HighlightTip[] }` and
  `getSeasonTips(locale?: Locale): DungeonTips[]`. Task 7 renders it.

Background: `getHighlights(slug, locale).tips` already holds every mob carrying tips, sorted
most-dangerous-first and cached per locale. This module adds no new source and no second order — it
groups. `dungeonList` is the season pool, which is what keeps `content/__fixtures__/` out of the
page: fixtures have no entry in the generated `dungeons.json`.

Today the real content has exactly one tipped mob, `254850` in `the-blinding-vale`. Assert that as
a lower bound, not as an equality, so writing a second card does not fail the suite.

- [ ] **Step 1: Write the failing test**

Create `src/lib/tipIndex.test.ts`:

```ts
// ABOUTME: Tests the season-wide tips grouping against the real dungeon pool, in both languages.
// ABOUTME: Asserts lower bounds, so writing another card raises the page without failing the suite.

import { describe, expect, it } from 'vitest'
import { getSeasonTips } from './tipIndex'
import { dungeonList } from './data'
import { getHighlights } from './highlights'

describe('getSeasonTips', () => {
  it('lists only dungeons that have tips', () => {
    const groups = getSeasonTips('en')
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) expect(group.tips.length).toBeGreaterThan(0)
  })

  it('holds the one tipped mob the codex has written', () => {
    const vale = getSeasonTips('en').find((g) => g.slug === 'the-blinding-vale')
    expect(vale?.tips.map((t) => t.npcId)).toContain(254850)
  })

  it('names each dungeon as the rest of the app does', () => {
    for (const group of getSeasonTips('en')) {
      const summary = dungeonList.find((d) => d.slug === group.slug)
      expect(group.name).toBe(summary?.englishName)
    }
  })

  it('keeps the order getHighlights already chose', () => {
    for (const group of getSeasonTips('en')) {
      expect(group.tips).toEqual(getHighlights(group.slug, 'en').tips)
    }
  })

  it('works in French, with the same dungeons', () => {
    expect(getSeasonTips('fr').map((g) => g.slug)).toEqual(getSeasonTips('en').map((g) => g.slug))
  })
})
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run src/lib/tipIndex.test.ts
```

Expected: FAIL — cannot resolve `./tipIndex`.

- [ ] **Step 3: Implement it**

Create `src/lib/tipIndex.ts`:

```ts
// ABOUTME: The season's tips, grouped by dungeon — what the /tips page lists.
// ABOUTME: Pure derivation over getHighlights: a card written tomorrow raises the page for free.

/**
 * Every tip in the season, dungeon by dungeon.
 *
 * Nothing is authored for this view. `getHighlights` already collects the mobs carrying tips and
 * sorts them most-dangerous-first, so the index inherits that order rather than choosing a second
 * one that could disagree with the briefing's.
 *
 * `dungeonList` is the season pool, which is also what keeps `content/__fixtures__/` out: a
 * fixture has no entry in the generated dungeon index.
 */

import { dungeonList } from './data'
import { getHighlights, type HighlightTip } from './highlights'
import { DEFAULT_LOCALE, type Locale } from './i18n/locales'

export interface DungeonTips {
  slug: string
  /** English, as every other view names a dungeon — MDT has no other. */
  name: string
  tips: HighlightTip[]
}

/**
 * A dungeon nobody has written a tip for is left out rather than shown empty: a column of empty
 * headings reads as a broken page, not an honest one.
 */
export function getSeasonTips(locale: Locale = DEFAULT_LOCALE): DungeonTips[] {
  return dungeonList
    .map((summary) => ({
      slug: summary.slug,
      name: summary.englishName,
      tips: getHighlights(summary.slug, locale).tips,
    }))
    .filter((group) => group.tips.length > 0)
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run src/lib/tipIndex.test.ts
```

Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
```

```bash
git add src/lib/tipIndex.ts src/lib/tipIndex.test.ts
git commit -m "Read the season's tips as one list

Grouping rather than collecting: the briefing already derives a
dungeon's tipped mobs and sorts them, and a second order here could
quietly disagree with it. Dungeons nobody has written for are left out,
because a column of empty headings reads as a broken page."
```

---

### Task 7: the page

**Files:**
- Create: `src/components/highlights/TipCard.tsx`
- Modify: `src/components/highlights/TipList.tsx`
- Create: `src/routes/TipsIndex.tsx`
- Create: `src/routes/TipsIndex.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/routes/Home.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`

**Interfaces:**
- Consumes: `getSeasonTips` / `DungeonTips` (task 6), `HighlightTip` from `../../lib/highlights`.
- Produces: the `/tips` route.

Background: `TipList` already draws exactly the card this page needs. Extracting it — rather than
writing a second one — is what keeps `MobTips` the only renderer of a tip, which is where the
"nothing reaches YouTube before a click" guarantee lives. `TipList`'s own comment says so.

- [ ] **Step 1: Add the interface strings, both languages**

In `src/lib/i18n/en.ts`, in a new `// Tips index` block after the Home block:

```ts
  'nav.tips': 'Tips',
  'tipsIndex.title': 'Tips',
  'tipsIndex.intro':
    'Everything written about a pull or a mob, dungeon by dungeon. Follow a dungeon to its map, or a chip to the pull it names.',
  'tipsIndex.empty': 'No tips have been written yet.',
```

In `src/lib/i18n/fr.ts`, at the matching place:

```ts
  'nav.tips': 'Astuces',
  'tipsIndex.title': 'Astuces',
  'tipsIndex.intro':
    'Tout ce qui a été écrit sur un pull ou sur un mob, donjon par donjon. Suivez un donjon vers sa carte, ou une pastille vers le pull qu\'elle nomme.',
  'tipsIndex.empty': 'Aucune astuce n\'a encore été écrite.',
```

- [ ] **Step 2: Write the failing test**

Create `src/routes/TipsIndex.test.tsx`:

```tsx
// ABOUTME: Tests the season-wide tips page: its groups, its two kinds of link, and its empty line.
// ABOUTME: Runs against the real content, so it asserts lower bounds rather than exact counts.

// @vitest-environment jsdom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { renderEn } from '../test/render'
import { getSeasonTips } from '../lib/tipIndex'
import TipsIndex from './TipsIndex'

afterEach(cleanup)

const inRouter = { wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter> }

describe('TipsIndex', () => {
  it('heads each group with the dungeon name, linking to its map', () => {
    renderEn(<TipsIndex />, inRouter)
    for (const group of getSeasonTips('en')) {
      expect(screen.getByRole('link', { name: group.name, exact: true })).toHaveAttribute(
        'href',
        `/d/${group.slug}/codex`,
      )
    }
  })

  it('shows a card per tipped mob, linking to its codex entry', () => {
    renderEn(<TipsIndex />, inRouter)
    const first = getSeasonTips('en')[0]
    const card = document.querySelector(`[data-tips="${first.tips[0].npcId}"]`)
    expect(card).not.toBeNull()
    expect(card?.querySelector(`a[href="/d/${first.slug}/codex/mob/${first.tips[0].npcId}"]`)).not.toBeNull()
  })

  it('carries the jump chip on every tip row', () => {
    renderEn(<TipsIndex />, inRouter)
    const chips = document.querySelectorAll('a[href*="?focus="]')
    expect(chips.length).toBeGreaterThan(0)
  })

  it('loads no embed before anyone clicks', () => {
    renderEn(<TipsIndex />, inRouter)
    expect(document.querySelectorAll('iframe')).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Run the test and watch it fail**

```bash
npx vitest run src/routes/TipsIndex.test.tsx
```

Expected: FAIL — cannot resolve `./TipsIndex`.

- [ ] **Step 4: Extract the card**

Create `src/components/highlights/TipCard.tsx`:

```tsx
// ABOUTME: One mob's tips as a card: its name, its threat, and the tips themselves.
// ABOUTME: Shared by the briefing and the season index, so MobTips stays the only tip renderer.

import { Link } from 'react-router-dom'
import type { HighlightTip } from '../../lib/highlights'
import { ThreatBadge } from '../codex/Badges'
import MobTips from '../codex/MobTips'

/**
 * Mounting `MobTips` rather than rendering the tips here is deliberate: the guarantee that
 * nothing reaches YouTube before a click lives inside that component, in its own state. A
 * second renderer would have to earn that guarantee again, and would be free to forget it.
 */
export default function TipCard({ slug, entry }: { slug: string; entry: HighlightTip }) {
  return (
    <div data-tips={entry.npcId} className="rounded border border-ink-700 bg-ink-850">
      <div className="flex items-center gap-2 px-3 pt-3">
        <Link
          to={`/d/${slug}/codex/mob/${entry.npcId}`}
          className="text-xs font-semibold text-ink-100 hover:text-gold-400"
        >
          {entry.mobName}
        </Link>
        <ThreatBadge threat={entry.threat} />
      </div>
      <MobTips slug={slug} npcId={entry.npcId} tips={entry.tips} fallback={entry.fallback} />
    </div>
  )
}
```

Note: the class list above must be `flex items-center gap-2 px-3 pt-3`, copied verbatim from
`TipList.tsx` — check it against the original rather than trusting this transcription.

Then reduce `src/components/highlights/TipList.tsx` to:

```tsx
// ABOUTME: The briefing's tips: every mob someone has written a tip for, one card each.
// ABOUTME: The card itself is shared with the season-wide index, so neither page owns it.

import type { HighlightTip } from '../../lib/highlights'
import TipCard from './TipCard'

export default function TipList({ slug, tips }: { slug: string; tips: HighlightTip[] }) {
  if (!tips.length) return null

  return (
    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
      {tips.map((entry) => (
        <TipCard key={entry.npcId} slug={slug} entry={entry} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Write the page**

Create `src/routes/TipsIndex.tsx`:

```tsx
// ABOUTME: The season-wide tips index: every written tip, grouped under the dungeon it belongs to.
// ABOUTME: A dungeon's name opens its map; a tip's chip opens the map on the pull it names.

import { Link } from 'react-router-dom'
import { getSeasonTips } from '../lib/tipIndex'
import { useI18n } from '../lib/i18n/context'
import LocaleSwitcher from '../components/LocaleSwitcher'
import SiteFooter from '../components/SiteFooter'
import TipCard from '../components/highlights/TipCard'

export default function TipsIndex() {
  const { t, locale } = useI18n()
  const groups = getSeasonTips(locale)

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <Link to="/" className="text-sm text-ink-400 hover:text-gold-400">
            ←
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-ink-100">{t('tipsIndex.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">{t('tipsIndex.intro')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
        </div>
      </header>

      {groups.length === 0 && <p className="text-sm text-ink-400">{t('tipsIndex.empty')}</p>}

      {groups.map((group) => (
        <section key={group.slug} className="mb-10">
          <h2 className="mb-3">
            <Link
              to={`/d/${group.slug}/codex`}
              className="text-xs font-semibold tracking-[0.2em] text-gold-500 hover:text-gold-400"
            >
              {group.name}
            </Link>
          </h2>
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {group.tips.map((entry) => (
              <TipCard key={entry.npcId} slug={group.slug} entry={entry} />
            ))}
          </div>
        </section>
      ))}

      <SiteFooter />
    </div>
  )
}
```

- [ ] **Step 6: Wire the route and the entry point**

In `src/App.tsx`, import `TipsIndex from './routes/TipsIndex'` and add, after the `/` route:

```tsx
        <Route path="/tips" element={<TipsIndex />} />
```

In `src/routes/Home.tsx`, add `Link` to the existing `react-router-dom` import if it is not already
there, and put the link before the search button in the header's right-hand cluster:

```tsx
          <Link
            to="/tips"
            className="rounded border border-ink-700 px-2 py-1 text-xs text-ink-400 transition hover:border-gold-500 hover:text-gold-400"
          >
            {t('nav.tips')}
          </Link>
```

- [ ] **Step 7: Run the tests and watch them pass**

```bash
npx vitest run src/routes/TipsIndex.test.tsx src/components/highlights/TipList.test.tsx
```

Expected: PASS both — `TipList.test.tsx` must stay green through the extraction, which is what
proves it was a refactor and not a rewrite.

- [ ] **Step 8: Run everything, typecheck, build**

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build
```

Expected: all green. The build is worth running here because this is the task that adds a route.

- [ ] **Step 9: Commit**

```bash
git add src/components/highlights/TipCard.tsx src/components/highlights/TipList.tsx src/routes/TipsIndex.tsx src/routes/TipsIndex.test.tsx src/App.tsx src/routes/Home.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit -m "Show the season's tips on one page

A tip was reachable only by opening the dungeon holding it, so nothing
showed what the codex has as a whole — the view a reader wants before
choosing a dungeon, and a contributor before choosing what to write. The
card is extracted rather than copied, so MobTips stays the one component
that decides when a video may load."
```

---

### Task 8: proving the map actually moves

**Files:**
- Modify: `e2e/tips.spec.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing. This is the only test that can observe the feature working.

Background, and why this is not ceremony: jsdom lays everything out at zero, so a mounted map's
container is 0×0 and `focusTransform` cannot be seen doing anything real through it. Tasks 1 and 4
pin the arithmetic and the wiring separately; only a browser shows the two together moving the map.

The facts this scenario rests on, read from the real data: The Blinding Vale's Sporeblight Belcher
is npc `254850`, enemy index `5`; its clone in pack `44` is clone index `10`, so its blip carries
`data-clone="5:10"`. Pack 44 holds four clones in total: `1:25`, `3:11`, `3:12`, `5:10`.

Playwright matches an accessible name as a case-insensitive substring by default — pass
`exact: true` when a name is a prefix of another one on the page.

- [ ] **Step 1: Write the failing test**

Append to `e2e/tips.spec.ts`:

```ts
test('a tip on the index jumps the map to the pull it names', async ({ page }) => {
  // Unfocused first, to measure what "not zoomed in" looks like on this blip.
  await page.goto('./#/d/the-blinding-vale/codex/mob/254850')
  const blip = page.locator('[data-clone="5:10"]')
  await expect(blip).toBeVisible()
  const before = await blip.boundingBox()

  await page.goto('./#/tips')
  const chip = page.getByRole('link', { name: /Pack 44/ })
  await expect(chip).toBeVisible()
  await chip.click()

  await expect(page).toHaveURL(/#\/d\/the-blinding-vale\/codex\/mob\/254850\?focus=44$/)

  await expect(blip).toBeVisible()
  const after = await blip.boundingBox()
  const viewport = await page.locator('[data-map-viewport]').boundingBox()

  // Zoomed in: the same blip is drawn substantially larger than at the whole-map fit.
  expect(after!.width).toBeGreaterThan(before!.width * 2)

  // And in view: its centre lies inside the map's visible area, not off an edge.
  const centre = { x: after!.x + after!.width / 2, y: after!.y + after!.height / 2 }
  expect(centre.x).toBeGreaterThan(viewport!.x)
  expect(centre.x).toBeLessThan(viewport!.x + viewport!.width)
  expect(centre.y).toBeGreaterThan(viewport!.y)
  expect(centre.y).toBeLessThan(viewport!.y + viewport!.height)
})
```

- [ ] **Step 2: Run it and watch it fail**

Check it out against the commit before task 1 to see it fail honestly, or temporarily strip the
`focus` prop from `DungeonPage`'s `<DungeonMap>` call and run:

```bash
npx playwright test e2e/tips.spec.ts -g "jumps the map"
```

Expected: FAIL on the width assertion — the blip is the same size, because nothing moved the map.
Restore the prop afterwards.

- [ ] **Step 3: Run the whole end-to-end suite**

```bash
npm run test:e2e
```

Expected: PASS. If the relay prints
`[WebServer] X [ERROR] Uncaught Error: internal error; reference = <id>` partway through, that is
the known, undiagnosed line already recorded in `CLAUDE.md`; every test around it still passes.

- [ ] **Step 4: Commit**

```bash
git add e2e/tips.spec.ts
git commit -m "Watch a tip move the map in a real browser

jsdom lays everything out at zero, so a mounted map's container is 0x0
and the focus arithmetic cannot be observed doing anything there. The
unit test pins the maths and the integration test pins the wiring; this
is the only place the two can be seen working together."
```

---

### Task 9: record the new coverage

**Files:**
- Modify: `CLAUDE.md`

Background: `CLAUDE.md` carries a table of what each test type actually covers, and a list of the
end-to-end scenarios. Leaving it stale is how that table stops being trusted.

- [ ] **Step 1: Update the coverage table**

In the "Where the repository actually stands" table:

- Unit row: add `tipIndex` to the list of covered `src/lib/` modules.
- Integration row: add `TipsIndex` and `TipCard` to the highlights chain.
- End-to-end row: add the new scenario — a tip on the season index jumping the map to the pull it
  names, asserted by the blip growing and landing inside the map's visible area.

- [ ] **Step 2: Verify the claim before committing it**

```bash
npm test
```

```bash
npm run test:e2e
```

Expected: both green. Do not write a coverage claim you have not just watched pass.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "Record what the tips index added to the suites

The coverage table is only worth reading if it is kept true."
```

---

## Self-review

**Spec coverage.** Design decision 1 (`/tips` route, home header link) → task 7. Decision 2
(`tipIndex.ts`) → task 6. Decision 3 (`TipCard` extracted) → task 7. Decision 4 (chip becomes a
`Link`, router wrappers) → task 5. Decision 5 (`packs:` first, clones as fallback) → task 2
(`tipFocusParam`) and task 4 (resolution). Decision 6 (`?focus=`) → tasks 2 and 4. Decision 7
(`location.key` as token) → tasks 3 and 4. Decision 8 (`focusTransform`) → tasks 1 and 3.
Decision 9 (empty dungeons omitted) → task 6. Decision 10 (i18n, both languages) → tasks 5 and 7.
Testing section → tasks 1–8; the coverage record → task 9.

**Names used consistently across tasks:** `FOCUS_PADDING`, `focusTransform(points, size, padding?)`,
`FocusTarget`, `tipFocusParam(tip)`, `parseFocus(value)`, `MapFocus { points, token }`, the `focus`
prop, `data-map-viewport`, `data-map-canvas`, `DungeonTips { slug, name, tips }`,
`getSeasonTips(locale?)`, `TipCard { slug, entry }`, and the six keys `tip.anywhere`,
`tip.showOnMap`, `nav.tips`, `tipsIndex.title`, `tipsIndex.intro`, `tipsIndex.empty`.

**Two things an executor must not skip:**

1. Task 5 breaks every render in `MobTips.test.tsx` and possibly in the four suites that mount it
   transitively. Wrapping them is part of that task, not a follow-up.
2. Task 3's `fit` must read the focus through a ref. Closing over it directly makes `fit` change
   identity on every parent render, which tears down the `ResizeObserver` and refits the map while
   the reader is panning.
