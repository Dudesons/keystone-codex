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
