// ABOUTME: The notes an MDT preset carries, as pins over the map with their text on hover.
// ABOUTME: Outside the transformed layer, so a pin keeps its size and its text stays legible.

import { useEffect, useRef, useState } from 'react'
import type { Point } from '../../lib/geometry'
import type { MdtNote } from '../../lib/mdt/objects'
import { useI18n } from '../../lib/i18n/context'
import { toContainerPoint, toMapPoint, type Transform } from './viewport'

/** How far a press must travel, in container pixels, before it reads as a drag rather than a
    click. Matches `DungeonMap`'s own pan threshold, for the same reason: below it, a hand is not
    yet steady enough to mean "move this", and a plain click must still land as one. */
const DRAG_THRESHOLD = 4

/**
 * A route's notes.
 *
 * This layer sits over the transformed map rather than inside it, for `PeerCursors`'s reason:
 * inside, every pin would need counter-scaling and its text re-rasterising at each zoom notch;
 * outside, a pin is a translation and its constant on-screen size follows on its own.
 *
 * Hover opens a note, a click keeps it open, and a click elsewhere closes it. The wrapper is
 * `pointer-events-none`: this layer is mounted over the whole map surface whenever Route mode
 * is active, including a hand-built route and a dungeon with no notes at all, so it must never
 * become a full-surface hit target that steals clicks meant for a mob blip, a pull outline or a
 * POI underneath it. Only a pin itself opts back in with `pointer-events-auto`.
 *
 * While the select tool supplies `onSelect`/`onMove`, a plain click on a pin selects it instead
 * of opening it, and a drag moves it. Both are gated on the note already carrying an id — see
 * the note on `selected` below.
 */
export default function NoteLayer({
  notes,
  transform,
  selectedId,
  onSelect,
  onMove,
  drawingActive,
}: {
  notes: MdtNote[]
  transform: Transform
  /** The object the page is editing, so the matching pin can mark itself. */
  selectedId?: string | null
  /** Clicking a pin. Supplied only while the select tool is active. */
  onSelect?: (id: string) => void
  /** Dragging a pin to a new position, in map pixels. Fires once, on release. */
  onMove?: (id: string, at: Point) => void
  /** Whether a note/arrow/freehand tool wants the map's own drawing surface right now — the
      surface sits under this layer, so a press that lands on a pin instead would otherwise
      fall through to the map container and start a pan in the middle of a gesture. Select is
      not one of these: it already gets its own protection from `onMove` below. */
  drawingActive?: boolean
}) {
  const { t } = useI18n()
  const [hovered, setHovered] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // The gesture in flight on a pin, if any. A single ref serves every pin: only one gesture can
  // be in progress at a time, and `id` is what a stray event from a different pin is checked
  // against below.
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null)
  // A drag's own release also fires a `click` — the browser's own sequencing, not something a
  // handler can opt out of. Left unguarded, that click would reopen or close the very note the
  // drag just moved. Set once a drag actually moved, and cleared by the click it is there to
  // catch.
  const justDragged = useRef(false)

  // A click outside the layer closes whatever note is pinned open (the design's "a click
  // elsewhere closes it"). Attached only while something is pinned, and detached the moment
  // nothing is — an idle layer keeps no listener on `document`. A click landing on a pin (or
  // inside its open text) lands inside `rootRef`, so this handler no-ops there and leaves the
  // pin's own `onClick` as the only thing that opens or closes it; letting both act on the same
  // click would race, and the pin would stop responding to its own clicks.
  useEffect(() => {
    if (pinned == null) return
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setPinned(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [pinned])

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {notes.map((note, index) => {
        const at = toContainerPoint(transform, note.at)
        const open = pinned === index || (pinned == null && hovered === index)
        // `undefined === undefined` would otherwise read as a match: a preset's untouched notes
        // carry no id at all until the document adopts them, so comparing against `selectedId`
        // unset must never mark one of them as selected.
        const selected = note.id != null && note.id === selectedId
        return (
          // A single element, not the pin nested in a positioned wrapper: the transform, the
          // testid and the hover/click handlers all have to land on what `note-pin-{index}`
          // resolves to, or a test reading `.style.transform` off it finds nothing there.
          <button
            key={`note-${index}`}
            data-testid={`note-pin-${index}`}
            data-selected={selected ? 'true' : undefined}
            title={t('map.note')}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onPointerDown={(e) => {
              // With no tool able to act on this pin, there is nothing here that needs the press
              // — letting it fall through is what lets the map's own pan start for no reason
              // other than "the hand happened to land on a pin".
              //
              // `onSelect` counts, and not only `onMove`: the eraser can act on a pin while
              // supplying no way to drag it, and a press left to fall through starts a pan that
              // takes pointer capture a few pixels later, retargeting the click away from the
              // pin it was aimed at. The tool that removes things would remove nothing.
              if (!onSelect && !onMove && !drawingActive) return
              e.stopPropagation()
              // Only the select tool can actually move this note, and only once it carries an id
              // (see the note on `selected` above) — a drawing tool still needed the stop above,
              // but has nothing to start a drag with.
              if (!onMove || !note.id) return
              drag.current = { id: note.id, x: e.clientX, y: e.clientY, moved: false }
            }}
            onPointerMove={(e) => {
              const d = drag.current
              if (!d || d.id !== note.id) return
              const dx = e.clientX - d.x
              const dy = e.clientY - d.y
              if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                d.moved = true
                // Captured only once a drag is confirmed, exactly as `DungeonMap`'s own pan
                // does: capturing any earlier would not change whether a plain click still
                // lands, but there is no reason to hold the pointer before there is a gesture
                // to hold it for.
                ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
              }
            }}
            onPointerUp={(e) => {
              const d = drag.current
              if (!d || d.id !== note.id) return
              drag.current = null
              if (!d.moved) return
              ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
              justDragged.current = true
              const root = rootRef.current
              if (!root) return
              const rect = root.getBoundingClientRect()
              const container = { x: e.clientX - rect.left, y: e.clientY - rect.top }
              onMove!(d.id, toMapPoint(transform, container))
            }}
            onClick={() => {
              if (justDragged.current) {
                // The click a drag's own release fires: it moved the note already, and must not
                // also toggle it open or closed.
                justDragged.current = false
                return
              }
              // While something can select this note, a plain click selects it rather than
              // opening it — the two are different tasks, and the pin's hover already shows the
              // text without needing to pin it open.
              if (onSelect && note.id) {
                onSelect(note.id)
                return
              }
              setPinned((p) => (p === index ? null : index))
            }}
            className="pointer-events-auto absolute top-0 left-0 flex items-start gap-1"
            style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                open
                  ? 'border-gold-400 bg-gold-500 text-ink-950'
                  : 'border-gold-500/70 bg-ink-900/90 text-gold-400 hover:bg-gold-500 hover:text-ink-950'
              } ${selected ? 'ring-2 ring-gold-400 ring-offset-1 ring-offset-ink-950' : ''}`}
            >
              !
            </span>
            {open && (
              <span
                // Stops a click meant to select or copy the text from bubbling to the button's
                // own onClick, which would otherwise read as a second pin-click and close the
                // note the reader is in the middle of reading.
                onClick={(e) => e.stopPropagation()}
                className="max-w-64 rounded border border-gold-500/40 bg-ink-900/95 px-2 py-1 text-xs text-ink-100 shadow-lg"
              >
                {note.text}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
