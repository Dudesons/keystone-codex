// ABOUTME: One HighlightSpell as an icon, a name linking into the codex, its tags, and its
// ABOUTME: dispel badges — shared by MobTable's row and BossStrip's card, sized differently.

import { Link } from 'react-router-dom'
import type { HighlightSpell } from '../../lib/highlights'
import { iconUrl } from '../../lib/data'
import { DispelBadges, TagBadge } from '../codex/Badges'

/**
 * The chip's name opens the codex card, not Wowhead.
 *
 * A briefing is read before a pull, and Wowhead is a tab away from it; the card carries the
 * cast time, the description and the written note the chip has no room for, and it is the one
 * place that links out. The `#spell-<id>` hash is what makes this link worth having next to
 * the mob's own — it lands on the row, not at the top of a card holding eight spells.
 */
export default function SpellChip({
  slug,
  npcId,
  spell,
  variant,
}: {
  slug: string
  npcId: number
  spell: HighlightSpell
  variant: 'row' | 'card'
}) {
  const icon = spell.icon ? (
    <img
      src={iconUrl(spell.icon)}
      alt=""
      loading="lazy"
      className={
        variant === 'row'
          ? 'h-5 w-5 rounded-sm border border-ink-600'
          : 'h-4 w-4 shrink-0 rounded-sm border border-ink-600'
      }
    />
  ) : (
    <span
      className={
        variant === 'row'
          ? 'h-5 w-5 rounded-sm border border-ink-700 bg-ink-800'
          : 'h-4 w-4 shrink-0 rounded-sm border border-ink-700 bg-ink-800'
      }
    />
  )

  const content = (
    <>
      {icon}
      <Link
        to={`/d/${slug}/codex/mob/${npcId}#spell-${spell.ids[0]}`}
        className={
          variant === 'row'
            ? 'text-xs font-medium text-ink-200 hover:text-gold-400'
            : 'truncate text-xs text-ink-200 hover:text-gold-400'
        }
      >
        {spell.name}
      </Link>
      {spell.tags.map((tag) => (
        <TagBadge key={tag} tag={tag} />
      ))}
      {/* With no hand-written tag, what MDT knows is still worth showing. */}
      {!spell.tags.length && spell.interruptible && <TagBadge tag="kick" />}
      <DispelBadges dispel={spell.dispel} />
    </>
  )

  if (variant === 'row') {
    return (
      <span className="flex items-center gap-1.5 rounded border border-ink-700 bg-ink-900 py-0.5 pl-0.5 pr-1.5">
        {content}
      </span>
    )
  }

  return <li className="flex flex-wrap items-center gap-1.5">{content}</li>
}
