// ABOUTME: The trap sentences of mobs that earned no row in MobTable, two columns, most
// ABOUTME: dangerous first. Each mob is folded behind a disclosure; expanding shows the sentence.

import { Link } from 'react-router-dom'
import type { HighlightTrap } from '../../lib/highlights'
import { ThreatBadge } from '../codex/Badges'

export default function TrapList({ slug, traps }: { slug: string; traps: HighlightTrap[] }) {
  if (!traps.length) return null

  return (
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
      {traps.map((trap) => (
        <details
          key={trap.npcId}
          data-trap={trap.npcId}
          className="group border-l-2 border-ink-700 pl-3 hover:border-gold-500"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
            <span className="text-ink-500 transition-transform group-open:rotate-90">▸</span>
            <Link
              to={`/d/${slug}/codex/mob/${trap.npcId}`}
              className="text-xs font-semibold text-ink-100 hover:text-gold-400"
            >
              {trap.mobName}
            </Link>
            <ThreatBadge threat={trap.threat} />
          </summary>
          {/* Authored markdown, already inline-rendered by the derivation. */}
          <p
            className="mt-0.5 pl-5 text-xs leading-relaxed text-ink-400"
            dangerouslySetInnerHTML={{ __html: trap.html }}
          />
        </details>
      ))}
    </div>
  )
}
