# Object tools — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan task by task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** a toolbar in the Route tab's left column lets you place a note, draw an arrow and draw
freehand; select, move and delete what is there; undo your own work; and watch a teammate's stroke
appear while they draw it.

**Architecture:** the page owns the active tool and the selection. The map owns the gesture, because
that is where the transform lives: a container-level surface converts pointer positions with
`toMapPoint`, and the stroke in progress is rendered through the existing `ObjectLayer` and
published on `awareness` beside the peer cursors. Committing calls the actions plan 1 built.

**Tech Stack:** React 19, TypeScript 5.7, Tailwind 4, Vitest (`app` project, jsdom), Testing
Library, Playwright, Y.js awareness.

**Spec:** [`docs/plans/2026-08-18-mdt-object-editing-design.md`](2026-08-18-mdt-object-editing-design.md).
Read decisions 6, 7 and 8 before Task 1 — they are the ones this plan implements.

**This is plan 2 of 2 for slice C.** Plan 1
([`2026-08-18-mdt-object-write-path-plan.md`](2026-08-18-mdt-object-write-path-plan.md)) built the
encoder, the document's `objects` key and undo. **It must be complete before this plan starts**:
every task here calls actions it created. This plan is where the slice becomes usable, and where the
two verification steps that need a real browser and the real game finally happen.

## Read this before trusting any code in this plan

**The code in this plan has never run.** On slice A, four defects came from code written into a plan
document and taken as verified — among them a layer copied without its `pointer-events-none`, which
made the whole map unclickable and was caught only by a reviewer opening a real browser. On slice B
every one of five tasks corrected something.

Treat every snippet here as a draft you are expected to correct. Say what you corrected and why.

## Global Constraints

- **Everything committed is in English** — code, comments, tests, commit messages. The UI and
  `content/**.md` are the only translated surfaces.
- **Commit style:** imperative mood, no `feat:`/`fix:` prefix. Subject says what the commit does to
  the repository; the body says **why**, never what.
- **Never** `--no-verify`, `--no-hooks`, `--no-pre-commit-hook`.
- **Never** `git add -A` or `git commit -a` — another session commits concurrently. Run
  `git status` first and stage only named paths.
- All code files start with two `// ABOUTME: ` comment lines.
- Component test files carry `// @vitest-environment jsdom` and declare their own
  `afterEach(cleanup)`; mount through `src/test/render.tsx` (`renderEn` / `renderFr`), never bare
  `render`.
- Every new UI string goes into **both** `src/lib/i18n/en.ts` and `src/lib/i18n/fr.ts`, in that
  file's flat style: `'map.foo': 'value'`, one per line, no nesting.
- `npm test` green with no skips, `npm run typecheck` and `npm run build` clean, before every commit.
- **A layer over the map keeps `pointer-events-none` unless it is deliberately a hit target**, and a
  hit target exists only while a tool needs it. This is decision 8 and it is not negotiable.
- Coordinates on the model are **map pixels**. `toMapPoint(transform, containerPoint)` converts a
  pointer position into them; the encoder handles MDT's space.

## Commands on this machine

`node` and `npm` may not be on the Bash tool's PATH. Check with `node --version`; if it fails:

```
export PATH="/c/Program Files/nodejs:$PATH"
```

`rm` is denied — delete with `node -e "require('fs').unlinkSync('…')"`.

## What plan 1 leaves you

```ts
// src/lib/mdt/objects.ts
export interface MdtNote   { kind: 'note';   at: Point; sublevel: number; text: string; from?: number; id?: string }
export interface MdtStroke { kind: 'stroke'; points: Point[]; sublevel: number; color: string; size: number
                             smooth: boolean; layer: number; isArrow: boolean; from?: number; id?: string }
export const MDT_STROKE_DEFAULTS: { size: number; smooth: boolean; layer: number }  // 5,  true,  -8
export const MDT_ARROW_DEFAULTS:  { size: number; smooth: boolean; layer: number }  // 13, false, -8
export function arrowAngle(points: Point[]): number

// src/lib/mdt/useRouteDoc.ts — on `actions`
addObject(object: MdtObject): void
updateObject(id: string, object: MdtObject): void
removeObject(id: string): void
undo(): void
redo(): void
// and on the hook's return value
canUndo: boolean
canRedo: boolean
```

An object has an `id` **only once it is stored in the document**. Before the first edit, `objects` is
still derived from `source` and every object's `id` is `undefined` — so nothing is selectable until
something has been edited. Task 6 has to handle that, and Task 2's first placement is what triggers
adoption.

## The collision this plan has to resolve first

`DungeonMap`'s outer container carries `onPointerDown`/`onPointerMove`/`onPointerUp` and takes
`setPointerCapture` once the pointer has moved 4px (`DungeonMap.tsx:126-167`). That is the pan
gesture, and the capture is deliberate: the comment there explains that capturing on press would aim
every click at the container and no blip would hear one.

A left-button drawing gesture collides with it head-on. **The resolution, which Task 3 implements:**
the drawing surface is a child of that container and calls `e.stopPropagation()` on `pointerdown`,
so the container's handler never runs and no pan starts. While a tool is active, left-drag draws and
does not pan.

The cost is stated rather than hidden: **you cannot pan by dragging while a tool is active.** The
wheel still zooms — it is bound with `addEventListener` on the container and never goes through the
pointer handlers — and `MapHud`'s zoom and fit buttons still work. To pan, drop the tool: `Escape`
deselects it, which Task 1 builds. Middle-drag is not an escape hatch, because the container's
handler already returns early on `e.button !== 0`.

## File map

| File | Responsibility | Task |
| --- | --- | --- |
| `src/components/route/ObjectToolbar.tsx` | **new** — the tool strip and the undo/redo buttons | 1 |
| `src/components/route/ObjectEditor.tsx` | **new** — the column's editing surface | 2 |
| `src/components/map/DrawSurface.tsx` | **new** — the gesture, and only the gesture | 3, 4 |
| `src/components/map/DungeonMap.tsx` | mounts `DrawSurface`; renders the stroke in progress | 3, 4, 5, 6 |
| `src/components/map/ObjectLayer.tsx` | the selection outline; the conditional hit target | 6 |
| `src/components/map/NoteLayer.tsx` | selection; drag to move | 6 |
| `src/routes/DungeonPage.tsx` | tool and selection state; the column's two states; the keyboard | 1, 2, 6 |
| `src/lib/mdt/useRouteDoc.ts` | the in-progress stroke on `awareness` | 5 |
| `src/lib/collab/presence.ts` | the peer's in-progress stroke on `Peer` | 5 |
| `src/lib/i18n/en.ts`, `fr.ts` | tool names, editor labels | 1, 2 |
| `e2e/drawing.spec.ts` | **new** — two browsers, one draws | 7 |

---

## Task 1: The tool strip, and the column's second state

**Files:**
- Create: `src/components/route/ObjectToolbar.tsx`
- Create: `src/components/route/ObjectToolbar.test.tsx`
- Modify: `src/routes/DungeonPage.tsx`
- Modify: `src/routes/DungeonPage.test.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Tool = 'note' | 'arrow' | 'freehand' | 'select'

  export default function ObjectToolbar(props: {
    tool: Tool | null
    onTool: (tool: Tool | null) => void
    canUndo: boolean
    canRedo: boolean
    onUndo: () => void
    onRedo: () => void
  }): ReactElement
  ```
  `Tool` is exported from `ObjectToolbar.tsx` and imported by every later task.

At the end of this task you can pick a tool, see the column switch away from the mob panel, press
`Escape` to drop it, and press undo. **Nothing draws yet** — that is Tasks 2 to 4.

- [ ] **Step 1: Add the strings**

`src/lib/i18n/en.ts`, at the end of the `map.*` run (which ends at `'map.score'`, around line 106):

```ts
  'map.toolNote': 'Note',
  'map.toolArrow': 'Arrow',
  'map.toolFreehand': 'Draw',
  'map.toolSelect': 'Select',
  'map.toolNone': 'Stop drawing',
  'map.undo': 'Undo',
  'map.redo': 'Redo',
```

`src/lib/i18n/fr.ts`, at the matching position:

```ts
  'map.toolNote': 'Note',
  'map.toolArrow': 'Flèche',
  'map.toolFreehand': 'Dessiner',
  'map.toolSelect': 'Sélectionner',
  'map.toolNone': 'Arrêter de dessiner',
  'map.undo': 'Annuler',
  'map.redo': 'Rétablir',
```

- [ ] **Step 2: Write the failing tests**

Create `src/components/route/ObjectToolbar.test.tsx`:

```tsx
// ABOUTME: Tests the tool strip: which tool is active, what it reports, and the undo buttons.
// ABOUTME: Stateless — the page owns the tool, and this only says which one is showing.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderEn } from '../../test/render'
import ObjectToolbar, { type Tool } from './ObjectToolbar'

afterEach(cleanup)

const mount = (over: Partial<React.ComponentProps<typeof ObjectToolbar>> = {}) =>
  renderEn(
    <ObjectToolbar
      tool={null}
      onTool={() => {}}
      canUndo={false}
      canRedo={false}
      onUndo={() => {}}
      onRedo={() => {}}
      {...over}
    />,
  )

describe('ObjectToolbar', () => {
  it('offers every tool', () => {
    mount()
    for (const name of ['Note', 'Arrow', 'Draw', 'Select']) {
      expect(screen.getByRole('button', { name, exact: true })).toBeDefined()
    }
  })

  it('reports the tool that was picked', () => {
    const picked: (Tool | null)[] = []
    mount({ onTool: (t) => picked.push(t) })
    fireEvent.click(screen.getByRole('button', { name: 'Arrow', exact: true }))
    expect(picked).toEqual(['arrow'])
  })

  it('reports null when the active tool is clicked again', () => {
    const picked: (Tool | null)[] = []
    mount({ tool: 'arrow', onTool: (t) => picked.push(t) })
    fireEvent.click(screen.getByRole('button', { name: 'Arrow', exact: true }))
    expect(picked).toEqual([null])
  })

  it('says which tool is active, in a way a test can read', () => {
    mount({ tool: 'freehand' })
    expect(screen.getByRole('button', { name: 'Draw', exact: true }).dataset.active).toBe('true')
    expect(screen.getByRole('button', { name: 'Note', exact: true }).dataset.active).toBeUndefined()
  })

  it('disables undo and redo when there is nothing to undo', () => {
    mount()
    expect(screen.getByRole('button', { name: 'Undo', exact: true }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Redo', exact: true }).hasAttribute('disabled')).toBe(true)
  })

  it('undoes when there is something to undo', () => {
    let undone = 0
    mount({ canUndo: true, onUndo: () => (undone += 1) })
    fireEvent.click(screen.getByRole('button', { name: 'Undo', exact: true }))
    expect(undone).toBe(1)
  })
})
```

Add to `src/routes/DungeonPage.test.tsx`, using that file's own `at()` helper (quoted at `:70-78`)
and its `getByRole('button', { name: 'Route' })` idiom:

```tsx
describe('The drawing tools', () => {
  it('are absent from the codex tab', () => {
    renderEn(at('/d/murder-row'))
    expect(screen.queryByRole('button', { name: 'Draw', exact: true })).toBeNull()
  })

  it('replace the mob panel while a tool is active, and give it back', () => {
    renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    // The mob panel's empty state is what the column shows with no tool active.
    expect(screen.getByText(/Hover a mob on the map/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Note', exact: true }))
    expect(screen.queryByText(/Hover a mob on the map/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Note', exact: true }))
    expect(screen.getByText(/Hover a mob on the map/)).toBeDefined()
  })

  it('drops the active tool on Escape', () => {
    renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note', exact: true }))
    expect(screen.getByRole('button', { name: 'Note', exact: true }).dataset.active).toBe('true')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.getByRole('button', { name: 'Note', exact: true }).dataset.active).toBeUndefined()
  })
})
```

**`{ name: 'Route' }` may match more than one button** — slice B hit exactly this and needed
`{ exact: true }`. Check before assuming, and add it if the locator resolves to two.

- [ ] **Step 3: Run them and watch them fail**

```bash
npx vitest run --project app src/components/route/ObjectToolbar.test.tsx src/routes/DungeonPage.test.tsx
```

- [ ] **Step 4: Write the toolbar**

Create `src/components/route/ObjectToolbar.tsx`:

```tsx
// ABOUTME: The route tab's tool strip: which object to place, and undo for the ones you placed.
// ABOUTME: Stateless — the page owns the active tool, because the map gesture needs it too.

import { useI18n } from '../../lib/i18n/context'

export type Tool = 'note' | 'arrow' | 'freehand' | 'select'

const TOOLS: { tool: Tool; key: 'map.toolNote' | 'map.toolArrow' | 'map.toolFreehand' | 'map.toolSelect'; glyph: string }[] = [
  { tool: 'select', key: 'map.toolSelect', glyph: '✥' },
  { tool: 'note', key: 'map.toolNote', glyph: '!' },
  { tool: 'arrow', key: 'map.toolArrow', glyph: '↗' },
  { tool: 'freehand', key: 'map.toolFreehand', glyph: '✎' },
]

export default function ObjectToolbar({
  tool,
  onTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  tool: Tool | null
  onTool: (tool: Tool | null) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="flex items-center gap-1 border-b border-ink-800 pb-2">
      {TOOLS.map(({ tool: candidate, key, glyph }) => {
        const active = tool === candidate
        return (
          <button
            key={candidate}
            // Clicking the active tool drops it, so the strip is its own way back to panning.
            onClick={() => onTool(active ? null : candidate)}
            title={t(key)}
            aria-label={t(key)}
            data-active={active ? 'true' : undefined}
            className={`rounded px-2 py-1 text-sm transition ${
              active ? 'bg-gold-500 text-ink-950' : 'text-ink-300 hover:bg-ink-800'
            }`}
          >
            {glyph}
          </button>
        )
      })}
      <span className="ml-auto flex gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title={t('map.undo')}
          aria-label={t('map.undo')}
          className="rounded px-2 py-1 text-sm text-ink-300 hover:bg-ink-800 disabled:opacity-40"
        >
          ↶
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title={t('map.redo')}
          aria-label={t('map.redo')}
          className="rounded px-2 py-1 text-sm text-ink-300 hover:bg-ink-800 disabled:opacity-40"
        >
          ↷
        </button>
      </span>
    </div>
  )
}
```

**Check that `t()`'s parameter type accepts these keys** — the dictionaries are typed, so a key that
is not in both files will not compile. That is the point of the typing, and it is why Step 1 comes
first.

- [ ] **Step 5: Wire the page**

In `src/routes/DungeonPage.tsx`, beside the other `useState` calls (the last is `cursorNpc` at
`:84`):

```tsx
  /** The active drawing tool, or null when the map is just a map. */
  const [tool, setTool] = useState<Tool | null>(null)
```

`Escape` drops it. A document listener, active only in Route mode:

```tsx
  useEffect(() => {
    if (mode !== 'route') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTool(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode])
```

Then the column's two states, replacing the `<aside data-testid="mob-panel">` block at `:260-274`.
Read that block before editing — it is quoted here as it stands, and the `<aside>` keeps its testid
and its classes:

```tsx
        {mode === 'route' && (
          <aside
            data-testid="mob-panel"
            className="thin-scroll w-[360px] shrink-0 space-y-2 overflow-y-auto border-r border-ink-800 bg-ink-900 p-3"
          >
            <ObjectToolbar
              tool={tool}
              onTool={setTool}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={actions.undo}
              onRedo={actions.redo}
            />
            {/* Weighing a pack and marking the map are different tasks; 360px shared between
                them would serve neither. The toolbar stays, so there is always a way back. */}
            {tool == null ? (
              <MobPanel
                slug={slug}
                dungeon={lookup.dungeon}
                enemy={panelEnemy}
                frozen={frozenNpc != null}
                onUnfreeze={() => setFrozenNpc(null)}
              />
            ) : null}
          </aside>
        )}
```

Task 2 puts `ObjectEditor` in the `null` branch's place. Until then a tool shows only the strip,
which is why the second page test asserts on the mob panel's absence rather than on an editor.

`canUndo`, `canRedo` and `actions.undo`/`actions.redo` come off `useRouteDoc` — find where the hook
is destructured in this file and extend it. Import `ObjectToolbar` and its `Tool` type.

- [ ] **Step 6: Run them and watch them pass**

```bash
npm test
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git status --short
git add src/components/route/ObjectToolbar.tsx src/components/route/ObjectToolbar.test.tsx \
        src/routes/DungeonPage.tsx src/routes/DungeonPage.test.tsx \
        src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit
```

Subject: `Give the route tab a strip for marking the map`. Body: why the column swaps rather than
stacks — weighing a pack and annotating are different tasks, and 360px shared between them serves
neither — and why the strip itself never leaves: it is the way back to panning.

---

## Task 2: Place a note, and write in it

**Files:**
- Create: `src/components/route/ObjectEditor.tsx`
- Create: `src/components/route/ObjectEditor.test.tsx`
- Modify: `src/components/map/DungeonMap.tsx`
- Modify: `src/routes/DungeonPage.tsx`
- Modify: `src/routes/DungeonPage.test.tsx`
- Modify: `src/lib/i18n/en.ts`, `src/lib/i18n/fr.ts`

**Interfaces:**
- Consumes: `Tool` from Task 1; `actions.addObject` / `actions.updateObject` from plan 1.
- Produces:
  ```ts
  export default function ObjectEditor(props: {
    /** The object being edited, or null when the tool is armed but nothing is placed yet. */
    object: MdtObject | null
    onChange: (object: MdtObject) => void
    onDelete: () => void
  }): ReactElement

  // added to DungeonMap's Props
  /** A click on the map surface, in map pixels. Only wired while a tool wants one. */
  onMapClick?: (at: Point) => void
  ```

The note is the cheapest of the three gestures — a click, no drag — so it is where the whole
place-then-edit path gets built and tested before a continuous gesture is added on top.

- [ ] **Step 1: Add the strings**

`en.ts`, after Task 1's keys:

```ts
  'map.noteText': 'Note text',
  'map.notePlaceHint': 'Click the map to place a note.',
  'map.deleteObject': 'Delete',
```

`fr.ts`:

```ts
  'map.noteText': 'Texte de la note',
  'map.notePlaceHint': 'Clique sur la carte pour poser une note.',
  'map.deleteObject': 'Supprimer',
```

- [ ] **Step 2: Write the failing tests**

Create `src/components/route/ObjectEditor.test.tsx`:

```tsx
// ABOUTME: Tests the column's editing surface: a note's text, and deleting the object.
// ABOUTME: Stateless — the page holds the object and writes the change to the document.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderEn } from '../../test/render'
import ObjectEditor from './ObjectEditor'
import type { MdtNote, MdtObject } from '../../lib/mdt/objects'

afterEach(cleanup)

const note: MdtNote = { kind: 'note', at: { x: 10, y: 20 }, sublevel: 1, text: 'kick', id: '1:0' }

describe('ObjectEditor', () => {
  it('says what to do when nothing is placed yet', () => {
    renderEn(<ObjectEditor object={null} onChange={() => {}} onDelete={() => {}} />)
    expect(screen.getByText(/Click the map to place a note/)).toBeDefined()
  })

  it('shows the note’s text and reports every edit', () => {
    const seen: MdtObject[] = []
    renderEn(<ObjectEditor object={note} onChange={(o) => seen.push(o)} onDelete={() => {}} />)
    const field = screen.getByLabelText('Note text')
    expect((field as HTMLTextAreaElement).value).toBe('kick')

    fireEvent.change(field, { target: { value: 'kick then lust' } })

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ kind: 'note', text: 'kick then lust', id: '1:0' })
  })

  it('reports a delete', () => {
    let deleted = 0
    renderEn(<ObjectEditor object={note} onChange={() => {}} onDelete={() => (deleted += 1)} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }))
    expect(deleted).toBe(1)
  })
})
```

Add to `src/routes/DungeonPage.test.tsx`'s `describe('The drawing tools')`:

```tsx
  it('places a note where the map was clicked, and opens it for writing', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note', exact: true }))

    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 40, clientY: 60 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 60 })

    // The pin is on the map…
    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeTruthy()
    // …and the column is ready for its text.
    expect(screen.getByLabelText('Note text')).toBeDefined()
  })

  it('writes what is typed into the placed note', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note', exact: true }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 40, clientY: 60 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 60 })

    fireEvent.change(screen.getByLabelText('Note text'), { target: { value: 'lust here' } })

    // The pin's own hover text is the note's, so the map is what proves the write landed.
    fireEvent.mouseEnter(container.querySelector('[data-testid="note-pin-0"]')!)
    expect(screen.getByText('lust here')).toBeDefined()
  })
```

**jsdom reports every element's `getBoundingClientRect` as all zeros**, so `toMapPoint` will place
the note at a position derived from `clientX/clientY` alone. That is fine for these tests — they
assert a note exists and carries the typed text, never where it is. **Do not write a test that
asserts a placed object's coordinates in jsdom**; the browser check at the end of this plan is what
covers position.

- [ ] **Step 3: Run them and watch them fail**

```bash
npx vitest run --project app src/components/route/ObjectEditor.test.tsx src/routes/DungeonPage.test.tsx
```

- [ ] **Step 4: Write the editor**

Create `src/components/route/ObjectEditor.tsx`:

```tsx
// ABOUTME: The column's editing surface: a placed object's text, and a way to remove it.
// ABOUTME: Stateless — the page holds the object and writes each change to the document.

import { useI18n } from '../../lib/i18n/context'
import type { MdtObject } from '../../lib/mdt/objects'

export default function ObjectEditor({
  object,
  onChange,
  onDelete,
}: {
  object: MdtObject | null
  onChange: (object: MdtObject) => void
  onDelete: () => void
}) {
  const { t } = useI18n()

  if (!object) {
    return <p className="text-xs text-ink-400">{t('map.notePlaceHint')}</p>
  }

  return (
    <div className="space-y-2">
      {object.kind === 'note' && (
        <label className="block space-y-1 text-xs text-ink-400">
          <span>{t('map.noteText')}</span>
          <textarea
            aria-label={t('map.noteText')}
            value={object.text}
            onChange={(e) => onChange({ ...object, text: e.target.value })}
            rows={4}
            className="w-full rounded border border-ink-700 bg-ink-850 px-2 py-1 text-ink-100"
          />
        </label>
      )}
      <button
        onClick={onDelete}
        className="rounded border border-threat-lethal/50 px-2 py-1 text-xs text-threat-lethal hover:bg-threat-lethal/10"
      >
        {t('map.deleteObject')}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Give the map a click to report**

In `src/components/map/DungeonMap.tsx`, add to `Props`:

```ts
  /** A click on the map surface, in map pixels. Wired only while a tool wants one. */
  onMapClick?: (at: Point) => void
```

Add it to the destructured parameter list, then mount the surface. It goes **container-level**, a
sibling of the transformed `<div>` — the same place `NoteLayer` and `PeerCursors` sit
(`DungeonMap.tsx:341-361`), because a pointer position is in container coordinates and `toMapPoint`
converts from there. Put it **before** `NoteLayer` in the JSX so a pin stays clickable above it:

```tsx
      {onMapClick && (
        <div
          data-testid="draw-surface"
          className="absolute inset-0"
          onPointerDown={(e) => {
            // The container above owns panning and takes pointer capture after 4px. Stopping the
            // event here is what keeps a drawing gesture from becoming a pan; the cost is that
            // drag-to-pan is unavailable while a tool is active, and Escape is the way out.
            e.stopPropagation()
            const rect = e.currentTarget.getBoundingClientRect()
            onMapClick(toMapPoint(transform, { x: e.clientX - rect.left, y: e.clientY - rect.top }))
          }}
        />
      )}
```

**This element deliberately has no `pointer-events-none`** — it exists to be a hit target, and it is
mounted only when `onMapClick` is supplied. That is decision 8's rule, not an exception to it: the
page passes `onMapClick` only while a tool is active.

Task 3 replaces this inline handler with `DrawSurface`, which needs move and release too. Keeping it
inline here is deliberate: this task's deliverable is a placed note, and a one-handler surface is
enough to earn a reviewer's gate on that.

- [ ] **Step 6: Wire the page**

In `src/routes/DungeonPage.tsx`, add the selection state and the placement handler:

```tsx
  /** The object being edited, by the id plan 1 puts on a stored object. */
  const [selectedObject, setSelectedObject] = useState<string | null>(null)

  const editing = route.objects.find((o) => o.id === selectedObject) ?? null

  const placeNote = (at: Point) => {
    actions.addObject({ kind: 'note', at, sublevel: 1, text: '' })
  }
```

`addObject` as plan 1 wrote it returns nothing, so the page cannot select the object it just placed.
**Change it to return the id it minted** — `addObject(object: MdtObject): string` — update its tests in
`useRouteDoc.test.tsx`, and record the change in your report as a correction to plan 1's interface.

Then select what you placed:

```tsx
  const placeNote = (at: Point) => {
    setSelectedObject(actions.addObject({ kind: 'note', at, sublevel: 1, text: '' }))
  }
```

The alternative — taking the last entry of `route.objects` after the write — is a guess about ordering
that a peer's concurrent edit breaks, and `luaToObjects` already reorders what it returns, so "last"
does not mean what it looks like it means.

`sublevel: 1` is hardcoded here. Every committed dungeon's objects are on sublevel 1, and nothing in
the app reads `sublevel` yet — the slice A design records that as deferred. Leave it, and do not
invent a sublevel selector.

Then pass the click through and put the editor in the column, replacing Task 1's `null` branch:

```tsx
            {tool == null ? (
              <MobPanel … />
            ) : (
              <ObjectEditor
                object={editing}
                onChange={(o) => o.id && actions.updateObject(o.id, o)}
                onDelete={() => {
                  if (editing?.id) actions.removeObject(editing.id)
                  setSelectedObject(null)
                }}
              />
            )}
```

and on `<DungeonMap …>`:

```tsx
            onMapClick={tool === 'note' ? placeNote : undefined}
```

- [ ] **Step 7: Run them and watch them pass**

```bash
npm test
npm run typecheck
npm run build
```

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/components/route/ObjectEditor.tsx src/components/route/ObjectEditor.test.tsx \
        src/components/map/DungeonMap.tsx src/routes/DungeonPage.tsx \
        src/routes/DungeonPage.test.tsx src/lib/i18n/en.ts src/lib/i18n/fr.ts
git commit
```

Subject: `Place a note on the map and write in it`. Body: why the surface stops the pointer event —
the container above owns panning and captures the pointer — and what that costs while a tool is
active.

---

## Task 3: The gesture, and the arrow

**Files:**
- Create: `src/components/map/DrawSurface.tsx`
- Create: `src/components/map/DrawSurface.test.tsx`
- Modify: `src/components/map/DungeonMap.tsx`
- Modify: `src/routes/DungeonPage.tsx`

**Interfaces:**
- Consumes: `Tool` from Task 1; `MDT_ARROW_DEFAULTS`, `MDT_STROKE_DEFAULTS` from plan 1.
- Produces:
  ```ts
  export default function DrawSurface(props: {
    transform: Transform
    /** 'point' reports one position on release; 'line' reports two; 'freehand' reports many. */
    mode: 'point' | 'line' | 'freehand'
    /** Fires while the gesture is live, in map pixels. Empty until the pointer moves. */
    onProgress?: (points: Point[]) => void
    /** Fires once on release, with the whole gesture. */
    onCommit: (points: Point[]) => void
  }): ReactElement

  // added to DungeonMap's Props, replacing Task 2's onMapClick
  drawing?: { mode: 'point' | 'line' | 'freehand'; onProgress?: (points: Point[]) => void; onCommit: (points: Point[]) => void }
  ```

`onMapClick` from Task 2 is **replaced**, not kept alongside. Delete it and move the note's
placement onto `drawing` with `mode: 'point'`, so there is one gesture path rather than two.

- [ ] **Step 1: Write the failing tests**

Create `src/components/map/DrawSurface.test.tsx`:

```tsx
// ABOUTME: Tests the drawing gesture: what each mode reports, and that it never reaches the pan.
// ABOUTME: jsdom lays everything out at zero, so these assert what was reported, never where.

// @vitest-environment jsdom
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderEn } from '../../test/render'
import DrawSurface from './DrawSurface'
import type { Point } from '../../lib/geometry'

afterEach(cleanup)

const transform = { scale: 1, tx: 0, ty: 0 }

const mount = (over: Partial<React.ComponentProps<typeof DrawSurface>> = {}) => {
  const commits: Point[][] = []
  const progress: Point[][] = []
  const r = renderEn(
    <DrawSurface
      transform={transform}
      mode="line"
      onProgress={(p) => progress.push(p)}
      onCommit={(p) => commits.push(p)}
      {...over}
    />,
  )
  return { ...r, commits, progress, surface: r.container.querySelector('[data-testid="draw-surface"]')! }
}

describe('DrawSurface', () => {
  it('reports one point in point mode, on release', () => {
    const { surface, commits } = mount({ mode: 'point' })
    fireEvent.pointerDown(surface, { clientX: 10, clientY: 10, pointerId: 1 })
    expect(commits).toHaveLength(0)
    fireEvent.pointerUp(surface, { clientX: 10, clientY: 10, pointerId: 1 })
    expect(commits).toHaveLength(1)
    expect(commits[0]).toHaveLength(1)
  })

  it('reports exactly two points in line mode, however far the pointer wandered', () => {
    const { surface, commits } = mount({ mode: 'line' })
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 50, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 90, clientY: 40, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 90, clientY: 40, pointerId: 1 })
    expect(commits[0]).toHaveLength(2)
  })

  it('samples a freehand gesture, and drops a move too close to the last point', () => {
    const { surface, commits } = mount({ mode: 'freehand' })
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    // Well past the threshold.
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    // A hair away from the last one: dropped.
    fireEvent.pointerMove(surface, { clientX: 41, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 80, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 80, clientY: 0, pointerId: 1 })
    expect(commits[0]).toHaveLength(3)
  })

  it('reports progress while the gesture is live', () => {
    const { surface, progress } = mount({ mode: 'freehand' })
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    expect(progress.length).toBeGreaterThan(0)
    expect(progress.at(-1)!.length).toBe(2)
  })

  it('commits nothing when a gesture is cancelled', () => {
    const { surface, commits } = mount({ mode: 'freehand' })
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerCancel(surface, { pointerId: 1 })
    expect(commits).toHaveLength(0)
  })

  it('keeps the gesture away from whatever owns panning above it', () => {
    let panStarted = 0
    const { container } = renderEn(
      <div onPointerDown={() => (panStarted += 1)}>
        <DrawSurface transform={transform} mode="freehand" onCommit={() => {}} />
      </div>,
    )
    fireEvent.pointerDown(container.querySelector('[data-testid="draw-surface"]')!, {
      clientX: 5,
      clientY: 5,
      pointerId: 1,
    })
    expect(panStarted).toBe(0)
  })
})
```

The last test is the one that matters most and the one most likely to pass for the wrong reason.
**After Step 3, delete the `e.stopPropagation()` line and confirm it goes red**, then restore it.
Report both outcomes. Slice B shipped a test that could not fail, and the whole-slice review found
another; a guard nobody has seen fail is not a guard.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/components/map/DrawSurface.test.tsx
```

- [ ] **Step 3: Write the surface**

Create `src/components/map/DrawSurface.tsx`:

```tsx
// ABOUTME: The drawing gesture over the map: press, move, release, in map pixels.
// ABOUTME: Deliberately a hit target — mounted only while a tool needs one, and it stops the pan.

import { useRef } from 'react'
import type { Point } from '../../lib/geometry'
import { toMapPoint, type Transform } from './viewport'

/**
 * How far the pointer must travel, in container pixels, before a freehand gesture keeps another
 * point. MDT's own freehand strokes run to well over a hundred points, so this is not about
 * matching the game — it is about a slow hand not producing ten times what a fast one does.
 */
const MIN_SAMPLE_DISTANCE = 6

export default function DrawSurface({
  transform,
  mode,
  onProgress,
  onCommit,
}: {
  transform: Transform
  mode: 'point' | 'line' | 'freehand'
  onProgress?: (points: Point[]) => void
  onCommit: (points: Point[]) => void
}) {
  /** The gesture in flight. Null between gestures, which is also how a cancel is remembered. */
  const gesture = useRef<{ points: Point[]; last: Point } | null>(null)

  const at = (e: React.PointerEvent): { map: Point; container: Point } => {
    const rect = e.currentTarget.getBoundingClientRect()
    const container = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    return { map: toMapPoint(transform, container), container }
  }

  return (
    <div
      data-testid="draw-surface"
      className="absolute inset-0"
      style={{ cursor: 'crosshair' }}
      onPointerDown={(e) => {
        // The container above owns panning and takes pointer capture past 4px of movement. Stopping
        // here is what keeps a stroke from becoming a pan — and it is why drag-to-pan is gone while
        // a tool is active. Escape drops the tool, which is the way back.
        e.stopPropagation()
        const { map, container } = at(e)
        gesture.current = { points: [map], last: container }
        onProgress?.([map])
      }}
      onPointerMove={(e) => {
        const g = gesture.current
        if (!g) return
        e.stopPropagation()
        const { map, container } = at(e)
        if (mode === 'point') return
        if (mode === 'line') {
          // Two points, whatever the hand did in between: the second is wherever it is now.
          g.points = [g.points[0], map]
        } else {
          if (Math.hypot(container.x - g.last.x, container.y - g.last.y) < MIN_SAMPLE_DISTANCE) return
          g.points = [...g.points, map]
        }
        g.last = container
        onProgress?.(g.points)
      }}
      onPointerUp={(e) => {
        const g = gesture.current
        if (!g) return
        e.stopPropagation()
        gesture.current = null
        onProgress?.([])
        onCommit(g.points)
      }}
      onPointerCancel={() => {
        // A cancelled gesture commits nothing: the browser took the pointer away mid-stroke, and
        // guessing what the hand meant is worse than losing it.
        gesture.current = null
        onProgress?.([])
      }}
    />
  )
}
```

**A line-mode gesture that never moves commits one point**, not two, and an arrow of one point has
no direction. Guard it at the caller in Step 5 rather than here — the surface reports the gesture, it
does not know what an arrow is.

- [ ] **Step 4: Mount it in the map**

In `src/components/map/DungeonMap.tsx`, replace Task 2's `onMapClick` prop and its inline surface
with:

```ts
  /** The gesture a tool wants, or absent when the map is just a map. */
  drawing?: {
    mode: 'point' | 'line' | 'freehand'
    onProgress?: (points: Point[]) => void
    onCommit: (points: Point[]) => void
  }
```

and, in the same place the inline surface sat — container level, before `NoteLayer`:

```tsx
      {drawing && (
        <DrawSurface
          transform={transform}
          mode={drawing.mode}
          onProgress={drawing.onProgress}
          onCommit={drawing.onCommit}
        />
      )}
```

- [ ] **Step 5: Wire the arrow**

In `src/routes/DungeonPage.tsx`, replace `onMapClick` with a `drawing` prop built from the tool:

```tsx
  const drawing = useMemo(() => {
    if (tool === 'note') {
      return { mode: 'point' as const, onCommit: (points: Point[]) => placeNote(points[0]) }
    }
    if (tool === 'arrow') {
      return {
        mode: 'line' as const,
        onCommit: (points: Point[]) => {
          // A press that never moved has no direction, so there is no arrow to make.
          if (points.length < 2) return
          actions.addObject({
            kind: 'stroke',
            points,
            sublevel: 1,
            color: STROKE_COLOR,
            isArrow: true,
            ...MDT_ARROW_DEFAULTS,
          })
        },
      }
    }
    return undefined
  }, [tool, actions])
```

and pass `drawing={drawing}` to `<DungeonMap …>`.

`STROKE_COLOR` is a module constant in `DungeonPage.tsx` for now:

```tsx
/**
 * What a stroke this app draws is coloured. MDT lets its author pick; we do not offer that yet, so
 * one value beats a colour picker nobody asked for. It is the colour every stroke in the real
 * export we have carries.
 */
const STROKE_COLOR = 'ff365c'
```

**Freehand is deliberately still absent from this switch** — Task 4 adds it, and a `tool` of
`'freehand'` therefore returns `undefined` here and draws nothing. Do not add it early; Task 4's red
step depends on it being missing.

- [ ] **Step 6: Run, then break the guard on purpose**

```bash
npx vitest run --project app src/components/map/DrawSurface.test.tsx
```

Then delete `e.stopPropagation()` from `onPointerDown`, re-run, confirm the pan test goes red,
restore it, re-run. Report both.

```bash
npm test
npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git status --short
git add src/components/map/DrawSurface.tsx src/components/map/DrawSurface.test.tsx \
        src/components/map/DungeonMap.tsx src/routes/DungeonPage.tsx
git commit
```

Subject: `Draw an arrow by dragging across the map`. Body: why one surface serves all three gestures
— the note's click is the degenerate case of a drag — and why a cancelled gesture commits nothing.

---

## Task 4: Freehand

**Files:**
- Modify: `src/routes/DungeonPage.tsx`
- Modify: `src/routes/DungeonPage.test.tsx`

**Interfaces:**
- Consumes: `DrawSurface`'s `'freehand'` mode from Task 3; `MDT_STROKE_DEFAULTS` from plan 1.

Task 3 built the sampling; this task is the wiring plus the thing the sampling is for. It is small on
purpose: the gesture already has its own tests, and what is left to prove is that a freehand stroke
reaches the document with more than two points and with `isArrow` false.

- [ ] **Step 1: Write the failing test**

Add to `src/routes/DungeonPage.test.tsx`'s `describe('The drawing tools')`:

```tsx
  it('draws a freehand stroke from a dragged gesture', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw', exact: true }))

    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    for (const x of [20, 40, 60, 80]) {
      fireEvent.pointerMove(surface, { clientX: x, clientY: x / 2, pointerId: 1 })
    }
    fireEvent.pointerUp(surface, { clientX: 80, clientY: 40, pointerId: 1 })

    // One stroke on the map, drawn as a polyline by the layer that already existed.
    const strokes = container.querySelectorAll('[data-testid^="stroke-"]')
    expect(strokes).toHaveLength(1)
    const polyline = strokes[0].querySelector('polyline')!
    expect(polyline.getAttribute('points')!.trim().split(/\s+/).length).toBeGreaterThan(2)
    // No arrowhead: this is a stroke, not an arrow.
    expect(strokes[0].querySelector('polygon')).toBeNull()
  })
```

`ObjectLayer` already puts `data-testid={`stroke-${index}`}` on each stroke's `<g>` and renders an
arrow's head as a `<polygon>` (`ObjectLayer.tsx:36-53`), so this test reads markup that exists rather
than asking for new test ids.

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run --project app src/routes/DungeonPage.test.tsx
```

Expected: no stroke appears, because Task 3's `drawing` switch returns `undefined` for `'freehand'`.

- [ ] **Step 3: Wire it**

In `src/routes/DungeonPage.tsx`, add the branch to the `drawing` memo, before the final `return
undefined`:

```tsx
    if (tool === 'freehand') {
      return {
        mode: 'freehand' as const,
        onCommit: (points: Point[]) => {
          // Under two points there is no line, only a click that missed.
          if (points.length < 2) return
          actions.addObject({
            kind: 'stroke',
            points,
            sublevel: 1,
            color: STROKE_COLOR,
            isArrow: false,
            ...MDT_STROKE_DEFAULTS,
          })
        },
      }
    }
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npm test
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/routes/DungeonPage.tsx src/routes/DungeonPage.test.tsx
git commit
```

Subject: `Draw freehand on the map`. Body: why a gesture under two points commits nothing, and why
the sampling threshold lives in the surface rather than here.

---

## Task 5: A teammate sees the stroke while it is drawn

**Files:**
- Modify: `src/lib/collab/presence.ts`
- Modify: `src/lib/mdt/useRouteDoc.ts`
- Modify: `src/lib/mdt/useRouteDoc.test.tsx`
- Modify: `src/components/map/DungeonMap.tsx`
- Modify: `src/components/map/DungeonMap.test.tsx`
- Modify: `src/routes/DungeonPage.tsx`

**Interfaces:**
- Produces:
  ```ts
  // src/lib/collab/presence.ts, added to Peer
  /** The stroke this peer is drawing right now, in map pixels. Absent between gestures. */
  drawing?: Point[]

  // src/lib/mdt/useRouteDoc.ts, added to the hook's return value
  /** Publishes the stroke in progress to the room. Ephemeral: it never enters the document. */
  setDrawing: (points: Point[]) => void

  // src/components/map/DungeonMap.tsx, added to Props
  /** The local stroke in progress, drawn with the same layer the committed ones use. */
  previewStroke?: MdtStroke | null
  ```

**This is decision 6, and the reason it is a whole task:** the stroke in progress rides on
`awareness`, exactly where the peer cursors already ride
(`useRouteDoc.ts:532-564`), and enters the document only on release. A document operation per sampled
point would put an order of magnitude more into the shared history for a gesture discarded as often
as it is kept.

Read `setCursor` before writing `setDrawing`: it throttles, reads the provider at the moment of
writing rather than through a closure, and does not throttle the null. **The same three decisions
apply here for the same reasons**, and the comments there explain each one.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/mdt/useRouteDoc.test.tsx`, using its `mount()` helper (`:85`) and the two-peer idiom
its collaboration tests use — two `mount()` calls joining the same room over `BroadcastChannel`
(quoted at `:359-380`):

```tsx
describe('A stroke in progress', () => {
  it('reaches a peer without touching the route', async () => {
    const host = mount()
    act(() => host.result.current.joinRoom('DRAW01', 'host'))
    const guest = mount()
    act(() => guest.result.current.joinRoom('DRAW01', 'guest'))

    act(() => host.result.current.setDrawing([{ x: 1, y: 1 }, { x: 2, y: 2 }]))

    await waitFor(() =>
      expect(guest.result.current.collab.peers.some((p) => !p.isSelf && p.drawing?.length === 2)).toBe(true),
    )
    // Ephemeral: nothing was written to the route.
    expect(guest.result.current.route.objects).toHaveLength(0)

    host.unmount()
    guest.unmount()
  })

  it('clears when the gesture ends', async () => {
    const host = mount()
    act(() => host.result.current.joinRoom('DRAW02', 'host'))
    const guest = mount()
    act(() => guest.result.current.joinRoom('DRAW02', 'guest'))

    act(() => host.result.current.setDrawing([{ x: 1, y: 1 }, { x: 2, y: 2 }]))
    await waitFor(() =>
      expect(guest.result.current.collab.peers.some((p) => !p.isSelf && p.drawing)).toBe(true),
    )

    act(() => host.result.current.setDrawing([]))

    await waitFor(() =>
      expect(guest.result.current.collab.peers.every((p) => !p.drawing?.length)).toBe(true),
    )

    host.unmount()
    guest.unmount()
  })
})
```

Add to `src/components/map/DungeonMap.test.tsx`, using its `mount()` helper (`:46`):

```tsx
describe('The stroke being drawn', () => {
  const stroke = (points: { x: number; y: number }[]) => ({
    kind: 'stroke' as const,
    points,
    sublevel: 1,
    color: 'ff365c',
    size: 5,
    smooth: true,
    layer: -8,
    isArrow: false,
  })

  it('draws the local gesture before it is committed', () => {
    const { container } = mount({ previewStroke: stroke([{ x: 0, y: 0 }, { x: 10, y: 10 }]) })
    expect(container.querySelector('[data-testid="preview-stroke"]')).toBeTruthy()
  })

  it('draws nothing when no gesture is live', () => {
    const { container } = mount({ previewStroke: null })
    expect(container.querySelector('[data-testid="preview-stroke"]')).toBeNull()
  })

  it('draws a peer’s gesture too', () => {
    const { container } = mount({
      cursors: [
        {
          clientId: 7,
          name: 'Ally',
          color: '#4a90c2',
          isSelf: false,
          drawing: [{ x: 0, y: 0 }, { x: 20, y: 20 }],
        },
      ],
    })
    expect(container.querySelector('[data-peer-drawing="7"]')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/lib/mdt/useRouteDoc.test.tsx src/components/map/DungeonMap.test.tsx
```

- [ ] **Step 3: Publish it**

In `src/lib/collab/presence.ts`, add `drawing?: Point[]` to `Peer`, and read it in `readPeers`
along`cursor`. Read that function before editing: whatever it does with a missing `cursor` is what it
should do with a missing `drawing`.

In `src/lib/mdt/useRouteDoc.ts`, add `setDrawing` beside `setCursor`, following its shape — throttled,
provider read at write time, and the empty case not throttled:

```ts
  /**
   * The stroke being drawn, published to the room and never to the document.
   *
   * Awareness for the same reason the cursor uses it: this is state that is true for as long as a
   * hand is moving and meaningless afterwards. It enters the document once, on release, as one
   * operation — a document write per sampled point would put a hundred-odd operations into a
   * shared history for a gesture that is thrown away as often as it is kept.
   *
   * An empty array is not throttled, exactly as leaving the map is not: a stroke that lingers
   * after the hand stopped says something false, and keeps saying it until someone moves.
   */
  const setDrawing = useCallback((points: Point[]) => { /* mirror setCursor */ }, [])
```

Add it to the hook's returned object (`useRouteDoc.ts:573`).

In `src/components/map/DungeonMap.tsx`, add `previewStroke?: MdtStroke | null` to `Props`, and render
both the local preview and the peers' inside the `<svg>`, right after the committed `ObjectLayer`
(`:245`) so a stroke in flight sits at the same depth as a finished one:

```tsx
          {previewStroke && (
            <g data-testid="preview-stroke" opacity={0.7}>
              <ObjectLayer strokes={[previewStroke]} />
            </g>
          )}
          {cursors
            ?.filter((p) => !p.isSelf && p.drawing && p.drawing.length > 1)
            .map((p) => (
              <g key={`draw-${p.clientId}`} data-peer-drawing={p.clientId} opacity={0.7}>
                <ObjectLayer
                  strokes={[{ ...PREVIEW_STROKE, points: p.drawing!, color: p.color.replace('#', '') }]}
                />
              </g>
            ))}
```

`PREVIEW_STROKE`, a module constant in `DungeonMap.tsx`, holds the fields a preview needs and a bare
list of points does not carry:

```ts
/** The fields a stroke needs to be drawable, for one that exists only while a hand is moving. */
const PREVIEW_STROKE = {
  kind: 'stroke' as const,
  points: [] as Point[],
  sublevel: 1,
  color: 'ffffff',
  isArrow: false,
  ...MDT_STROKE_DEFAULTS,
}
```

**Check `Peer.color`'s format before trusting `.replace('#', '')`.** `presence.ts:6-15` types it as
`string`, and `PeerCursors` passes it straight to `fill`, which means it has the hash. `MdtStroke`'s
`color` is documented as hex **without** the hash. If either is not what this says, fix the
conversion and say so.

- [ ] **Step 4: Wire the page**

In `src/routes/DungeonPage.tsx`, hold the in-progress points and pass them both ways:

```tsx
  const [progress, setProgress] = useState<Point[]>([])
```

Add `onProgress` to each branch of the `drawing` memo that draws a line — the arrow's and the
freehand's, not the note's — as:

```tsx
        onProgress: (points: Point[]) => {
          setProgress(points)
          setDrawing(points)
        },
```

and on `<DungeonMap …>`:

```tsx
            previewStroke={
              progress.length > 1
                ? { kind: 'stroke', points: progress, sublevel: 1, color: STROKE_COLOR,
                    isArrow: tool === 'arrow', ...(tool === 'arrow' ? MDT_ARROW_DEFAULTS : MDT_STROKE_DEFAULTS) }
                : null
            }
```

`setDrawing` comes off `useRouteDoc`. Guard it the way `setCursor` is guarded in this file — read how
`onCursorMove` is passed (`DungeonPage.tsx:295`: `collab.status === 'off' ? undefined : setCursor`)
and follow it, so a solo session publishes nothing.

- [ ] **Step 5: Run them and watch them pass**

```bash
npm test
npm run typecheck
npm run build
```

- [ ] **Step 6: Commit**

```bash
git status --short
git add src/lib/collab/presence.ts src/lib/mdt/useRouteDoc.ts src/lib/mdt/useRouteDoc.test.tsx \
        src/components/map/DungeonMap.tsx src/components/map/DungeonMap.test.tsx src/routes/DungeonPage.tsx
git commit
```

Subject: `Let the room watch a stroke being drawn`. Body: why awareness and not the document — the
shared history should not grow by a hundred operations for a gesture thrown away as often as it is
kept — and why the empty case is not throttled.

---

## Task 6: Select it, move it, delete it

**Files:**
- Modify: `src/components/map/ObjectLayer.tsx`
- Modify: `src/components/map/ObjectLayer.test.tsx`
- Modify: `src/components/map/NoteLayer.tsx`
- Modify: `src/components/map/NoteLayer.test.tsx`
- Modify: `src/components/map/DungeonMap.tsx`
- Modify: `src/routes/DungeonPage.tsx`
- Modify: `src/routes/DungeonPage.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // ObjectLayer
  props: { strokes: MdtStroke[]; selectedId?: string | null; onSelect?: (id: string) => void }
  // NoteLayer — added to its existing props
  selectedId?: string | null
  onSelect?: (id: string) => void
  onMove?: (id: string, at: Point) => void
  ```

**This is decision 8, the one with a scar behind it.** A stroke becomes a hit target **only** when
`onSelect` is supplied, which the page does only while the select tool is active. `ObjectLayer`'s
wrapping `<g className="pointer-events-none">` stays; the hit target is a wider invisible path
*inside* it that opts back in — the same shape `NoteLayer` already uses, where the layer is inert and
each pin opts in with `pointer-events-auto`.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/map/ObjectLayer.test.tsx`:

```tsx
describe('Selecting a stroke', () => {
  const stroke = (id: string): MdtStroke => ({
    kind: 'stroke',
    points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
    sublevel: 1,
    color: 'ff365c',
    size: 5,
    smooth: true,
    layer: -8,
    isArrow: false,
    id,
  })

  it('is inert to the pointer when nothing can select it', () => {
    const { container } = renderEn(
      <svg>
        <ObjectLayer strokes={[stroke('a')]} />
      </svg>,
    )
    expect(container.querySelector('[data-hit="a"]')).toBeNull()
  })

  it('grows a hit target once selection is possible', () => {
    const { container } = renderEn(
      <svg>
        <ObjectLayer strokes={[stroke('a')]} onSelect={() => {}} />
      </svg>,
    )
    const hit = container.querySelector('[data-hit="a"]')!
    expect(hit).toBeTruthy()
    // Wider than the stroke, or a thin line would be impossible to hit.
    expect(Number(hit.getAttribute('stroke-width'))).toBeGreaterThan(5 * 0.3)
  })

  it('reports which stroke was clicked', () => {
    const picked: string[] = []
    const { container } = renderEn(
      <svg>
        <ObjectLayer strokes={[stroke('a')]} onSelect={(id) => picked.push(id)} />
      </svg>,
    )
    fireEvent.click(container.querySelector('[data-hit="a"]')!)
    expect(picked).toEqual(['a'])
  })

  it('marks the selected stroke, so a reader can see which it is', () => {
    const { container } = renderEn(
      <svg>
        <ObjectLayer strokes={[stroke('a')]} selectedId="a" onSelect={() => {}} />
      </svg>,
    )
    expect(container.querySelector('[data-selected="true"]')).toBeTruthy()
  })
})
```

Add to `src/routes/DungeonPage.test.tsx`'s `describe('The drawing tools')`:

```tsx
  it('deletes the selected object with the Delete key', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Draw', exact: true }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 40, clientY: 0, pointerId: 1 })
    expect(container.querySelectorAll('[data-testid^="stroke-"]')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Select', exact: true }))
    fireEvent.click(container.querySelector('[data-hit]')!)
    fireEvent.keyDown(document, { key: 'Delete' })

    expect(container.querySelectorAll('[data-testid^="stroke-"]')).toHaveLength(0)
  })

  it('leaves Delete alone while a note’s text has focus', () => {
    const { container } = renderEn(at('/d/murder-row'))
    fireEvent.click(screen.getByRole('button', { name: 'Route' }))
    fireEvent.click(screen.getByRole('button', { name: 'Note', exact: true }))
    const surface = container.querySelector('[data-testid="draw-surface"]')!
    fireEvent.pointerDown(surface, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(surface, { clientX: 20, clientY: 20, pointerId: 1 })

    const field = screen.getByLabelText('Note text')
    field.focus()
    fireEvent.keyDown(field, { key: 'Delete' })

    // Still there: a Delete in a text field is a text edit, not a command.
    expect(container.querySelector('[data-testid="note-pin-0"]')).toBeTruthy()
  })
```

The second test is the reason the keyboard listener needs care, and it is the kind that passes
vacuously if the handler was never reached. **After Step 3, remove the focus guard and confirm it
goes red**, then restore it. Report both.

- [ ] **Step 2: Run them and watch them fail**

```bash
npx vitest run --project app src/components/map/ObjectLayer.test.tsx src/routes/DungeonPage.test.tsx
```

- [ ] **Step 3: Make them selectable**

In `src/components/map/ObjectLayer.tsx`, take the two new props and, inside each stroke's `<g>`, add
the hit target **before** the visible polyline so the visible one stays on top:

```tsx
            {onSelect && stroke.id && (
              // Wider than the stroke and invisible: a 1.5px line is otherwise unhittable. The
              // layer stays `pointer-events-none`; this single path opts back in, exactly as a
              // note's pin does. It exists only while something can select it.
              <polyline
                data-hit={stroke.id}
                points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(widthOf(stroke) * 3, 16)}
                className="pointer-events-auto"
                style={{ cursor: 'pointer' }}
                onClick={() => onSelect(stroke.id!)}
              />
            )}
```

and mark the selection on the group: `data-selected={selectedId === stroke.id ? 'true' : undefined}`,
plus whatever visible treatment reads as selected — a second polyline behind the first, wider and in
`--color-gold-400`, is consistent with how the app marks things elsewhere. Check what the codebase
already uses for a selected state before inventing one.

`NoteLayer` gains `selectedId`, `onSelect` and `onMove`. Its pins are already
`pointer-events-auto`, so selection is a call in the existing `onClick` beside the pin/unpin it
already does. **Read that handler and the `useEffect` above it before editing** — the file's comments
explain a race between the pin's own click and the document listener, and adding a third thing to
that click needs to not reopen it. Dragging a pin to move it is a pointer gesture on the pin: press,
move, release, then `onMove(id, at)` once. Convert with `toMapPoint`, which the file does not import
yet.

Then in `DungeonMap.tsx`, add these three to `Props` and pass them down to both layers. **Use these
names at the map's boundary**, not the layers' shorter ones — `DungeonMap`'s props already say what
kind of thing they concern (`onCloneClick`, `onHoverClone`), and a bare `onSelect` on a component
that also has blips, POIs and pulls would not say which:

```ts
  /** The object the page is editing, so the layers can mark it. */
  selectedObjectId?: string | null
  /** Clicking an object. Supplied only while something can select one — see the note on hit targets. */
  onSelectObject?: (id: string) => void
  /** Dragging an object to a new position, in map pixels. */
  onMoveObject?: (id: string, at: Point) => void
```

Inside `DungeonMap`, these map onto the layers' props: `selectedId={selectedObjectId}`,
`onSelect={onSelectObject}`, `onMove={onMoveObject}`.

- [ ] **Step 4: Wire the page**

`selectedObject` already exists from Task 2. Pass selection down only while the select tool is
active:

```tsx
            selectedObjectId={tool === 'select' ? selectedObject : null}
            onSelectObject={tool === 'select' ? setSelectedObject : undefined}
            onMoveObject={
              tool === 'select'
                ? (id: string, at: Point) => {
                    const object = route.objects.find((o) => o.id === id)
                    if (object?.kind === 'note') actions.updateObject(id, { ...object, at })
                  }
                : undefined
            }
```

Extend Task 1's `Escape` listener into the one keyboard handler this feature needs:

```tsx
  useEffect(() => {
    if (mode !== 'route') return
    const onKey = (e: KeyboardEvent) => {
      // A key pressed in a text field is text, not a command. Without this, Delete eats the
      // object whose text you are editing and Ctrl+Z fights the field's own undo.
      const target = e.target as HTMLElement | null
      const typing =
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'INPUT' ||
        target?.isContentEditable === true
      if (typing) return

      if (e.key === 'Escape') {
        setTool(null)
        setSelectedObject(null)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject) {
        e.preventDefault()
        actions.removeObject(selectedObject)
        setSelectedObject(null)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) actions.redo()
        else actions.undo()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode, selectedObject, actions])
```

- [ ] **Step 5: Run, then break the focus guard on purpose**

```bash
npx vitest run --project app src/routes/DungeonPage.test.tsx
```

Remove the `if (typing) return` line, re-run, confirm the text-field test goes red, restore it,
re-run. Report both.

```bash
npm test
npm run typecheck
npm run build
```

- [ ] **Step 6: Commit**

```bash
git status --short
git add src/components/map/ObjectLayer.tsx src/components/map/ObjectLayer.test.tsx \
        src/components/map/NoteLayer.tsx src/components/map/NoteLayer.test.tsx \
        src/components/map/DungeonMap.tsx src/routes/DungeonPage.tsx src/routes/DungeonPage.test.tsx
git commit
```

Subject: `Select an object on the map, move it, remove it`. Body: why a stroke is only a hit target
while something can select it — a layer over the map that is always hittable swallowed every click on
this branch once — and why a key pressed in a text field is not a command.

---

## Task 7: Two browsers, one drawing

**Files:**
- Create: `e2e/drawing.spec.ts`

**Interfaces:**
- Consumes: `newParticipant`, `openSession`, `acceptInvitation`, `roomCode`, `firstDungeonSlug` from
  `e2e/fixtures.ts`.

jsdom models neither pointer capture nor event throughput, and Task 5's awareness path is the one
thing in this slice that only a real socket between two real browsers can prove. This is also the
first scenario in the suite that draws, so **watch it fail before you make it pass** — the standard
the existing suite holds itself to.

- [ ] **Step 1: Write the failing test**

Create `e2e/drawing.spec.ts`:

```ts
// ABOUTME: What only two real browsers can prove: a stroke arrives while it is being drawn.
// ABOUTME: The gesture is a real pointer drag, because jsdom models neither capture nor throughput.

import { test, expect } from '@playwright/test'
import { acceptInvitation, firstDungeonSlug, newParticipant, openSession, roomCode } from './fixtures'

test('a stroke reaches the room while it is still being drawn, then stays', async ({ page, browser }) => {
  const slug = await firstDungeonSlug(page)
  await openSession(page, slug, 'Artist')
  const room = new URL(page.url()).hash.match(/room=([A-Z0-9]+)/)?.[1]
  expect(room, 'the host’s URL should carry the room code').toBeTruthy()

  const watcherContext = await newParticipant(browser)
  const watcher = await watcherContext.newPage()
  await acceptInvitation(watcher, slug, room!, 'Watcher')

  await page.getByRole('button', { name: 'Draw', exact: true }).click()

  const surface = page.getByTestId('draw-surface')
  const box = (await surface.boundingBox())!
  const start = { x: box.x + box.width * 0.3, y: box.y + box.height * 0.4 }

  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  for (let i = 1; i <= 8; i += 1) {
    await page.mouse.move(start.x + i * 12, start.y + i * 6)
  }

  // Mid-gesture: the watcher already sees it, because it rides on awareness and not the document.
  await expect(watcher.locator('[data-peer-drawing]')).toBeVisible()

  await page.mouse.up()

  // And after release it is a committed stroke on both sides, with no peer preview left over.
  await expect(page.locator('[data-testid^="stroke-"]')).toHaveCount(1)
  await expect(watcher.locator('[data-testid^="stroke-"]')).toHaveCount(1)
  await expect(watcher.locator('[data-peer-drawing]')).toHaveCount(0)

  await watcherContext.close()
})
```

**`openSession` does not return the room code** — `fixtures.ts` says so explicitly, and says the one
caller that needs it reads it from the share link. Reading it out of the URL as above may not work;
check what the host's URL actually holds after opening a session, and if it holds nothing, use the
`Copy the link` button the way `session.spec.ts` does. Say which you used.

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test:e2e -- drawing.spec.ts
```

Playwright starts both servers itself. If the run is clean on the first attempt **before** you have
looked at why, be suspicious: confirm the assertions can fail by breaking one deliberately.

- [ ] **Step 3: Fix whatever it finds**

There is no implementation step here on purpose: Tasks 1–6 built the feature, and this task's job is
to find what jsdom could not see. Whatever it finds, fix at its source and say what it was. The
likeliest candidates, in order: the gesture never starting because the pan handler still sees the
pointer; the preview not clearing on release; and the throttle in `setDrawing` making the mid-gesture
assertion flaky, which is a real signal about the interval rather than a reason to add a wait.

- [ ] **Step 4: Run the whole suite**

```bash
npm run test:e2e
npm test
```

`npm test` deliberately does not run the Playwright specs, and `e2e/**` is excluded from the `app`
project in `vite.config.ts` for that reason. Do not change that.

- [ ] **Step 5: Commit**

```bash
git status --short
git add e2e/drawing.spec.ts
git commit
```

Subject: `Prove a stroke crosses the room while it is drawn`. Body: what jsdom cannot see here —
pointer capture and event throughput — and why the mid-gesture assertion is the one that matters:
it is the only thing that distinguishes awareness from a document write.

---

## Verification, once the tasks are done

- `npm test` green with no skips, `npm run test:e2e` green, `npm run typecheck` and `npm run build`
  clean.
- Every deliberately-broken guard restored, and both outcomes reported: the `stopPropagation` in
  `DrawSurface` (Task 3), and the text-field focus guard (Task 6).
- `git diff main --stat` touches no file outside this plan's file map and plan 1's.

### In a real browser, by hand

jsdom lays everything out at zero and models no hit testing. The worst defect on this branch was
invisible to every test and obvious in a browser. Report what you saw for each, not that you
verified it.

1. With **no tool active**, `document.elementFromPoint` at a blip's centre still reaches the blip,
   and clicking a mob still moves the forces total. This is the regression that has bitten twice.
2. With a tool active, dragging draws and **does not pan**; the wheel still zooms; `Escape` drops the
   tool and dragging pans again.
3. A note placed by clicking lands **where you clicked**, at two different zoom levels. jsdom cannot
   check this at all.
4. A freehand stroke follows the hand rather than cutting corners, and its point count is in the
   same order as MDT's own — the fixture's stroke has 132 points for a gesture across the map.
5. An arrow's head points the way you dragged.
6. With the select tool, clicking a thin stroke selects it on the first attempt; `Delete` removes it;
   dragging a note's pin moves it.

### In the game — **mandatory for this slice**

This is the first time the app writes into a preset, and only the client can say whether it accepts
what we produce. A green suite is not evidence here.

1. In the app: import a real MDT route, then add a note, an arrow and a freehand stroke, and delete
   one object that came from the import.
2. Copy the MDT string and import it into MDT in game.
3. Confirm, and report each separately: the note reads its text at the right place; the arrow points
   the right way; the freehand stroke has the shape drawn; the deleted object is gone; **and every
   object that was neither created nor deleted is still exactly where and what it was.**

The last of those is the one this whole slice's design was built around. If it fails, the encoder is
rewriting entries it should have passed through, and the answer is in `objectsToLua`'s verbatim
branch — not in the game.
