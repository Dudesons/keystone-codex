// ABOUTME: The briefing's tips: every mob someone has written a tip for, linking to its card.
// ABOUTME: It mounts the card's own MobTips, so a video still loads only once the reader asks.

import { Link } from 'react-router-dom'
import type { HighlightTip } from '../../lib/highlights'
import { ThreatBadge } from '../codex/Badges'
import MobTips from '../codex/MobTips'

/**
 * Mounting `MobTips` rather than rendering the tips here is deliberate: the guarantee that
 * nothing reaches YouTube before a click lives inside that component, in its own state. A
 * second renderer would have to earn that guarantee again, and would be free to forget it.
 */
export default function TipList({ slug, tips }: { slug: string; tips: HighlightTip[] }) {
  if (!tips.length) return null

  return (
    <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
      {tips.map((entry) => (
        <div
          key={entry.npcId}
          data-tips={entry.npcId}
          className="rounded border border-ink-700 bg-ink-850"
        >
          <div className="flex items-center gap-2 px-3 pt-3">
            <Link
              to={`/d/${slug}/codex/mob/${entry.npcId}`}
              className="text-xs font-semibold text-ink-100 hover:text-gold-400"
            >
              {entry.mobName}
            </Link>
            <ThreatBadge threat={entry.threat} />
          </div>
          <MobTips
            slug={slug}
            npcId={entry.npcId}
            tips={entry.tips}
            fallback={entry.fallback}
          />
        </div>
      ))}
    </div>
  )
}
