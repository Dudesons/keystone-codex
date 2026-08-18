// ABOUTME: One HighlightSpell as an icon, a Wowhead-linked name, its tags, and its dispel
// ABOUTME: badges — shared by MobTable's row and BossStrip's card, which differ only in size.

import type { HighlightSpell } from '../../lib/highlights'
import { iconUrl, wowheadUrl } from '../../lib/data'
import { useI18n } from '../../lib/i18n/context'
import { DispelBadges, TagBadge } from '../codex/Badges'

export default function SpellChip({
  spell,
  variant,
}: {
  spell: HighlightSpell
  variant: 'row' | 'card'
}) {
  const { locale } = useI18n()

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
      <a
        href={wowheadUrl(spell.ids[0], locale)}
        target="_blank"
        rel="noreferrer"
        className={
          variant === 'row'
            ? 'text-xs font-medium text-ink-200 hover:text-gold-400'
            : 'truncate text-xs text-ink-200 hover:text-gold-400'
        }
      >
        {spell.name}
      </a>
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
