// ABOUTME: A mob's forces, its share of the dungeon's requirement, and MDT's efficiency score.
// ABOUTME: Mounted both in the map tooltip and in the route's mob panel, so they cannot diverge.

import { contribution, scoreColor } from '../../lib/contribution'
import { useI18n } from '../../lib/i18n/context'
import type { Dungeon, Enemy } from '../../lib/types'

export default function MobStats({
  enemy,
  dungeon,
  showForces = true,
}: {
  enemy: Enemy
  dungeon: Dungeon
  /**
   * Whether to print the raw forces count. False in the mob panel, where `MobCard`'s own
   * header immediately below already says it. True in the tooltip, the default, where there
   * is no `MobCard` beneath it and the forces count is the primary number.
   */
  showForces?: boolean
}) {
  const { t, plural, formatPercent } = useI18n()
  const { count, share, score } = contribution(enemy, dungeon)

  if (count === 0) {
    // `MobCard`'s header says `common.noForce` too whenever it is mounted right below (the mob
    // panel's case) — printing it again here would be the same duplication `showForces` exists
    // to avoid. In the tooltip, where nothing else says it, this stays the only sentence.
    return showForces ? <div className="text-xs text-ink-400">{t('common.noForce')}</div> : null
  }

  return (
    <div className="flex items-baseline gap-2 text-xs">
      {showForces && (
        <span className="font-semibold text-ink-100 tabular-nums">{plural('common.forces', count)}</span>
      )}
      <span data-testid="mob-share" className="text-ink-400 tabular-nums">
        {formatPercent(share, 2)} {t('map.share')}
      </span>
      {score != null && (
        <span className="ml-auto text-ink-400">
          {t('map.score')}{' '}
          <span
            data-testid="mob-score"
            className="font-semibold tabular-nums"
            style={{ color: scoreColor(score) }}
          >
            {score.toFixed(1)}
          </span>
        </span>
      )}
    </div>
  )
}
