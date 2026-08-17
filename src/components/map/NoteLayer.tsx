// ABOUTME: The notes an MDT preset carries, as pins over the map with their text on hover.
// ABOUTME: Outside the transformed layer, so a pin keeps its size and its text stays legible.

import { useState } from 'react'
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
 * Hover opens a note, a click pins it open — reading a long note while the pointer wanders is
 * the ordinary case, not an edge one.
 */
export default function NoteLayer({ notes, transform }: { notes: MdtNote[]; transform: Transform }) {
  const { t } = useI18n()
  const [hovered, setHovered] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)

  return (
    <div className="absolute inset-0 overflow-hidden">
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
            className="absolute top-0 left-0 flex items-start gap-1"
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
              <span className="max-w-64 rounded border border-gold-500/40 bg-ink-900/95 px-2 py-1 text-xs text-ink-100 shadow-lg">
                {note.text}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
