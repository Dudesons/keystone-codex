// ABOUTME: Every written trap sentence of the dungeon, two columns, most dangerous first.
// ABOUTME: The trap is the line that avoids the wipe, so none of them is folded away.

import { Link } from 'react-router-dom'
import type { HighlightTrap } from '../../lib/highlights'
import { ThreatBadge } from '../codex/Badges'

export default function TrapList({ slug, traps }: { slug: string; traps: HighlightTrap[] }) {
  if (!traps.length) return null

  return (
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
      {traps.map((trap) => (
        <div
          key={trap.npcId}
          data-trap={trap.npcId}
          className="border-l-2 border-ink-700 pl-3 hover:border-gold-500"
        >
          <div className="flex items-center gap-2">
            <Link
              to={`/d/${slug}/codex/mob/${trap.npcId}`}
              className="text-xs font-semibold text-ink-100 hover:text-gold-400"
            >
              {trap.mobName}
            </Link>
            <ThreatBadge threat={trap.threat} />
          </div>
          {/* Authored markdown, already inline-rendered by the derivation. */}
          <p
            className="mt-0.5 text-xs leading-relaxed text-ink-400"
            dangerouslySetInnerHTML={{ __html: trap.html }}
          />
        </div>
      ))}
    </div>
  )
}
