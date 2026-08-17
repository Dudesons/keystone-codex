// ABOUTME: The notes an MDT preset carries, as pins over the map with their text on hover.
// ABOUTME: Outside the transformed layer, so a pin keeps its size and its text stays legible.

import { useEffect, useRef, useState } from 'react'
import type { MdtNote } from '../../lib/mdt/objects'
import { useI18n } from '../../lib/i18n/context'
import { toContainerPoint, type Transform } from './viewport'

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
 */
export default function NoteLayer({ notes, transform }: { notes: MdtNote[]; transform: Transform }) {
  const { t } = useI18n()
  const [hovered, setHovered] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

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
        return (
          // A single element, not the pin nested in a positioned wrapper: the transform, the
          // testid and the hover/click handlers all have to land on what `note-pin-{index}`
          // resolves to, or a test reading `.style.transform` off it finds nothing there.
          <button
            key={`note-${index}`}
            data-testid={`note-pin-${index}`}
            title={t('map.note')}
            onMouseEnter={() => setHovered(index)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setPinned((p) => (p === index ? null : index))}
            className="pointer-events-auto absolute top-0 left-0 flex items-start gap-1"
            style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition ${
                open
                  ? 'border-gold-400 bg-gold-500 text-ink-950'
                  : 'border-gold-500/70 bg-ink-900/90 text-gold-400 hover:bg-gold-500 hover:text-ink-950'
              }`}
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
