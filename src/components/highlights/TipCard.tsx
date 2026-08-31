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
