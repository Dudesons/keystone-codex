// ABOUTME: One card per boss, in encounter order: portrait, trap sentence, and its prio-1 spells.
// ABOUTME: A boss's trap lives here rather than in the trap list, so it is not shown twice.

import { Link } from 'react-router-dom'
import type { HighlightMob, HighlightSpell } from '../../lib/highlights'
import { iconUrl, portraitUrl, wowheadUrl } from '../../lib/data'
import { useI18n } from '../../lib/i18n/context'
import { DispelBadges, TagBadge } from '../codex/Badges'

export default function BossStrip({ slug, bosses }: { slug: string; bosses: HighlightMob[] }) {
  if (!bosses.length) return null

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {bosses.map((boss) => (
        <article
          key={boss.npcId}
          data-boss={boss.npcId}
          className="rounded-lg border border-ink-800 bg-ink-900 p-3"
        >
          <div className="flex items-center gap-2.5">
            {boss.displayId != null && (
              <img
                src={portraitUrl(boss.displayId)}
                alt=""
                loading="lazy"
                className="h-10 w-10 shrink-0 rounded-full border border-gold-500/40 object-cover"
              />
            )}
            <h3 className="min-w-0 text-sm font-semibold text-ink-100">
              <Link to={`/d/${slug}/map/mob/${boss.npcId}`} className="hover:text-gold-400">
                {boss.name}
              </Link>
            </h3>
          </div>

          {/* Authored markdown, already inline-rendered by the derivation. */}
          {boss.trapHtml && (
            <p
              className="mt-2 text-xs leading-relaxed text-ink-400"
              dangerouslySetInnerHTML={{ __html: boss.trapHtml }}
            />
          )}

          {boss.spells.length > 0 && (
            <ul className="mt-2 space-y-1">
              {boss.spells.map((spell) => (
                <SpellItem key={spell.name} spell={spell} />
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  )
}

function SpellItem({ spell }: { spell: HighlightSpell }) {
  const { locale } = useI18n()

  return (
    <li className="flex flex-wrap items-center gap-1.5">
      {spell.icon ? (
        <img
          src={iconUrl(spell.icon)}
          alt=""
          loading="lazy"
          className="h-4 w-4 shrink-0 rounded-sm border border-ink-600"
        />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded-sm border border-ink-700 bg-ink-800" />
      )}
      <a
        href={wowheadUrl(spell.ids[0], locale)}
        target="_blank"
        rel="noreferrer"
        className="truncate text-xs text-ink-200 hover:text-gold-400"
      >
        {spell.name}
      </a>
      {spell.tags.map((tag) => (
        <TagBadge key={tag} tag={tag} />
      ))}
      {/* With no hand-written tag, what MDT knows is still worth showing. */}
      {!spell.tags.length && spell.interruptible && <TagBadge tag="kick" />}
      <DispelBadges dispel={spell.dispel} />
    </li>
  )
}
