// ABOUTME: Draws one arrow and one name per participant, over the map.
// ABOUTME: Outside the transformed layer, so a cursor keeps its size at every zoom level.

import type { Peer } from '../../lib/collab/presence'
import { toContainerPoint, type Transform } from './viewport'

/**
 * The cursors of everyone else in the room.
 *
 * This layer sits over the transformed map rather than inside it. Inside, every arrow would
 * have to be counter-divided by the scale and its label re-rasterised at each zoom notch;
 * outside, a cursor is a translation and its constant on-screen size follows on its own.
 * Anyone looking elsewhere is clipped by the container, which is the right answer: an arrow
 * pinned to the edge would claim a position its owner is not at.
 */
export default function PeerCursors({ peers, transform }: { peers: Peer[]; transform: Transform }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {peers
        .filter((p) => !p.isSelf && p.cursor)
        .map((p) => {
          const at = toContainerPoint(transform, p.cursor!)
          return (
            <div
              key={p.clientId}
              data-peer-cursor={p.clientId}
              className="absolute top-0 left-0 flex items-start gap-1"
              style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
            >
              <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">
                <path
                  d="M1 1 L1 16 L5 12.5 L7.5 18 L10 17 L7.5 11.5 L12.5 11 Z"
                  fill={p.color}
                  stroke="#0b0d12"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              {p.name && (
                <span
                  className="rounded px-1 py-0.5 text-[10px] font-semibold whitespace-nowrap text-ink-950"
                  style={{ background: p.color }}
                >
                  {p.name}
                </span>
              )}
            </div>
          )
        })}
    </div>
  )
}
