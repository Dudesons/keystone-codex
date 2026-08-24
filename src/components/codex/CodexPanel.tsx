// ABOUTME: The codex side panel: the dungeon plan, bosses and trash, or one pack or mob.
// ABOUTME: Follows the map — clicking a unit scrolls its card into view.

import { useEffect, useMemo, useRef } from 'react'
import type { DungeonLookup } from '../../lib/data'
import { getDungeonContent } from '../../lib/content'
import { getIndicators } from '../../lib/indicators'
import type { Enemy } from '../../lib/types'
import { useI18n } from '../../lib/i18n/context'
import MobCard from './MobCard'

export interface PullRef {
  index: number
  color: string
}

/**
 * Scroll something the panel was asked to show, and flash it so the eye finds it.
 *
 * `block: 'nearest'` rather than `'start'`: a target already on screen should not make the
 * panel jump. `animate` is guarded because jsdom does not implement it.
 */
function bringIntoView(target: Element | null | undefined) {
  target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  target?.animate?.(
    [{ boxShadow: '0 0 0 2px #e0b552' }, { boxShadow: '0 0 0 2px transparent' }],
    { duration: 1200, easing: 'ease-out' },
  )
}

interface Props {
  slug: string
  lookup: DungeonLookup
  selectedPack: number | null
  selectedMob: number | null
  /** Mob to scroll the panel to, after a click on the map. */
  focusNpc: number | null
  /** Spell to scroll the panel to, named by the address a briefing chip links to. */
  focusSpell?: number | null
  /** Which pull each mob belongs to in the current route. */
  pullByNpc: ReadonlyMap<number, PullRef>
  onSelectMob: (npcId: number | null) => void
  onHoverMob: (npcId: number | null) => void
  onClearSelection: () => void
}

export default function CodexPanel({
  slug,
  lookup,
  selectedPack,
  selectedMob,
  focusNpc,
  focusSpell,
  pullByNpc,
  onSelectMob,
  onHoverMob,
  onClearSelection,
}: Props) {
  const { t, plural, locale } = useI18n()
  const rootRef = useRef<HTMLDivElement>(null)
  const dungeonContent = getDungeonContent(slug, locale)

  // The panel follows the map: clicking a unit brings its card into view, rather than
  // forcing you to hunt for it in a list of forty mobs.
  useEffect(() => {
    if (focusNpc == null) return
    bringIntoView(rootRef.current?.querySelector(`[data-npc="${focusNpc}"]`))
  }, [focusNpc, selectedPack, selectedMob])

  // A briefing chip links to one spell inside a card. Under a hash router the whole route
  // already occupies the document's single fragment, so the browser cannot act on the
  // `#spell-<id>` part — the panel resolves it, exactly as it follows the map above.
  useEffect(() => {
    if (focusSpell == null) return
    bringIntoView(rootRef.current?.querySelector(`[data-spell="${focusSpell}"]`))
  }, [focusSpell, selectedMob])

  const packMobs = useMemo(() => {
    if (selectedPack == null) return []
    const pack = lookup.packs.get(selectedPack)
    if (!pack) return []
    const ids = new Map<number, number>()
    for (const ref of pack.members) {
      const enemy = lookup.enemyByIdx.get(ref.enemyIdx)
      if (enemy) ids.set(enemy.id, (ids.get(enemy.id) ?? 0) + 1)
    }
    return [...ids.entries()].map(([id, n]) => ({ enemy: lookup.enemyById.get(id)!, n }))
  }, [selectedPack, lookup])

  const cardProps = (npcId: number) => {
    const pull = pullByNpc.get(npcId)
    return { pullIndex: pull?.index, pullColor: pull?.color }
  }

  if (selectedMob != null) {
    const enemy = lookup.enemyById.get(selectedMob)
    if (enemy) {
      return (
        <div ref={rootRef} className="space-y-3">
          <button className="text-xs text-ink-400 hover:text-gold-400" onClick={() => onSelectMob(null)}>
            {t('common.back')}
          </button>
          <MobCard slug={slug} enemy={enemy} onHover={onHoverMob} {...cardProps(enemy.id)} />
        </div>
      )
    }
  }

  if (selectedPack != null) {
    const pack = lookup.packs.get(selectedPack)
    return (
      <div ref={rootRef} className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-ink-100">{t('codex.pack', { n: selectedPack })}</h2>
            <p className="text-xs text-ink-400">
              {plural('common.forces', pack?.count ?? 0)} ·{' '}
              {plural('common.units', pack?.members.length ?? 0)}
            </p>
          </div>
          <button className="text-xs text-ink-400 hover:text-gold-400" onClick={onClearSelection}>
            {t('common.close')}
          </button>
        </div>
        {packMobs.map(({ enemy, n }) => (
          <div key={enemy.id}>
            {n > 1 && <div className="mb-1 text-[11px] text-ink-600">{t('codex.inThisPack', { n })}</div>}
            <MobCard
              slug={slug}
              enemy={enemy}
              onHover={onHoverMob}
              onSelect={onSelectMob}
              {...cardProps(enemy.id)}
            />
          </div>
        ))}
      </div>
    )
  }

  // The card's word, not MDT's flag: a mob the card demotes belongs in the trash list, marked
  // in place, rather than in the boss group under a heading that would make it a boss again.
  const isBossRank = (e: Enemy) => getIndicators(slug, e, locale).rank === 'boss'
  const bosses = lookup.dungeon.enemies.filter(isBossRank)
  const seen = new Set<number>()
  const uniqueTrash = lookup.dungeon.enemies.filter(
    (e) => !isBossRank(e) && (seen.has(e.id) ? false : (seen.add(e.id), true)),
  )

  return (
    <div ref={rootRef} className="space-y-5">
      {dungeonContent?.html && (
        <section
          className="prose-codex rounded-lg border border-ink-700 bg-ink-850 px-3 py-3"
          dangerouslySetInnerHTML={{ __html: dungeonContent.html }}
        />
      )}

      {bosses.length > 0 && (
        <section>
          <h2 className="mb-2 text-[10px] font-bold tracking-widest text-ink-400">{t('codex.bosses')}</h2>
          <div className="space-y-2">
            {bosses.map((enemy) => (
              <MobCard
                key={enemy.mdtIdx}
                slug={slug}
                enemy={enemy}
                compact
                onHover={onHoverMob}
                onSelect={onSelectMob}
                {...cardProps(enemy.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-[10px] font-bold tracking-widest text-ink-400">
          {t('codex.trash', { n: uniqueTrash.length })}
        </h2>
        <div className="space-y-2">
          {uniqueTrash.map((enemy) => (
            <MobCard
              key={enemy.id}
              slug={slug}
              enemy={enemy}
              compact
              onHover={onHoverMob}
              onSelect={onSelectMob}
              {...cardProps(enemy.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
