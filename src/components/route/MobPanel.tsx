// ABOUTME: The route tab's left column: what the hovered mob is worth, and its codex entry.
// ABOUTME: Stateless — the page decides which mob it shows and whether it is held against hover.

import MobCard from '../codex/MobCard'
import MobStats from '../codex/MobStats'
import { useI18n } from '../../lib/i18n/context'
import type { Dungeon, Enemy } from '../../lib/types'

export default function MobPanel({
  slug,
  dungeon,
  enemy,
  frozen,
  onUnfreeze,
}: {
  slug: string
  dungeon: Dungeon
  /** The mob to show, or null for the empty state. */
  enemy: Enemy | null
  /** True when the panel is holding this mob against the hover. */
  frozen: boolean
  /** Called when the pin in the header is clicked. Only rendered when frozen. */
  onUnfreeze: () => void
}) {
  const { t } = useI18n()

  if (!enemy) {
    return (
      <p className="rounded border border-ink-700 bg-ink-850 px-3 py-2 text-xs text-ink-400">
        {t('route.hoverAMob')}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {/* The name and the boss badge are `MobCard`'s own header, mounted right below — this
          row exists only for the one thing `MobCard` cannot show: whether the hover is held. */}
      {frozen && (
        <div className="flex justify-end">
          <button
            onClick={onUnfreeze}
            title={t('route.unpin')}
            aria-label={t('route.unpin')}
            className="rounded px-1 text-gold-400 hover:text-gold-300"
          >
            📌
          </button>
        </div>
      )}
      <MobStats enemy={enemy} dungeon={dungeon} />
      <MobCard slug={slug} enemy={enemy} />
    </div>
  )
}
