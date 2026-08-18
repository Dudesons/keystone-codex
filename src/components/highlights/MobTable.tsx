// ABOUTME: One row per mob: its name and threat on the left, its prio-1 spells as chips.
// ABOUTME: A row is a mob because that is the unit a player thinks in, and it halves the length.

import { Link } from 'react-router-dom'
import type { HighlightMob, HighlightSpell } from '../../lib/highlights'
import { iconUrl, wowheadUrl } from '../../lib/data'
import { useI18n } from '../../lib/i18n/context'
import { DispelBadges, TagBadge, ThreatBadge } from '../codex/Badges'

export default function MobTable({ slug, mobs }: { slug: string; mobs: HighlightMob[] }) {
  if (!mobs.length) return null

  return (
    <div className="overflow-hidden rounded-lg border border-ink-800">
      {mobs.map((mob) => (
        <MobRow key={mob.npcId} slug={slug} mob={mob} />
      ))}
    </div>
  )
}

function MobRow({ slug, mob }: { slug: string; mob: HighlightMob }) {
  const { t } = useI18n()

  return (
    <div
      data-mob={mob.npcId}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-800 px-3 py-2.5 last:border-b-0 hover:bg-ink-800/40"
    >
      <div className="flex min-w-[13rem] items-center gap-2">
        <Link
          to={`/d/${slug}/map/mob/${mob.npcId}`}
          className="text-sm font-semibold text-ink-100 hover:text-gold-400"
        >
          {mob.name}
        </Link>
        <ThreatBadge threat={mob.threat} />
        {mob.role === 'miniboss' && (
          <span className="rounded border border-gold-500/40 bg-gold-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-gold-400">
            {t('role.miniboss')}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5">
        {mob.spells.map((spell) => (
          <SpellChip key={spell.name} spell={spell} />
        ))}
      </div>
    </div>
  )
}

function SpellChip({ spell }: { spell: HighlightSpell }) {
  const { locale } = useI18n()

  return (
    <span className="flex items-center gap-1.5 rounded border border-ink-700 bg-ink-900 py-0.5 pl-0.5 pr-1.5">
      {spell.icon ? (
        <img
          src={iconUrl(spell.icon)}
          alt=""
          loading="lazy"
          className="h-5 w-5 rounded-sm border border-ink-600"
        />
      ) : (
        <span className="h-5 w-5 rounded-sm border border-ink-700 bg-ink-800" />
      )}
      <a
        href={wowheadUrl(spell.ids[0], locale)}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-ink-200 hover:text-gold-400"
      >
        {spell.name}
      </a>
      {spell.tags.map((tag) => (
        <TagBadge key={tag} tag={tag} />
      ))}
      {/* With no hand-written tag, what MDT knows is still worth showing. */}
      {!spell.tags.length && spell.interruptible && <TagBadge tag="kick" />}
      <DispelBadges dispel={spell.dispel} />
    </span>
  )
}
