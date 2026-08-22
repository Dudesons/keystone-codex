// ABOUTME: The small coloured badges of a mob card: threat, spell tag, CC and dispel types.
// ABOUTME: CC and dispel come straight from MDT; threat and tag come from the written entry.

import type { Threat, SpellTag } from '../../lib/content'
import { useI18n } from '../../lib/i18n/context'
import { DEFAULT_LOCALE } from '../../lib/i18n/locales'

const THREAT_STYLE: Record<Threat, string> = {
  low: 'bg-threat-low/15 text-threat-low border-threat-low/40',
  medium: 'bg-threat-medium/15 text-threat-medium border-threat-medium/40',
  high: 'bg-threat-high/15 text-threat-high border-threat-high/40',
  lethal: 'bg-threat-lethal/20 text-threat-lethal border-threat-lethal/50',
}

export function ThreatBadge({ threat }: { threat?: Threat }) {
  const { t } = useI18n()
  if (!threat) return null
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${THREAT_STYLE[threat]}`}>
      {t(`threat.${threat}`)}
    </span>
  )
}

const TAG_STYLE: Record<SpellTag, string> = {
  kick: 'bg-tag-kick/20 text-tag-kick border-tag-kick/50',
  frontal: 'bg-tag-frontal/20 text-tag-frontal border-tag-frontal/50',
  dodge: 'bg-tag-dodge/20 text-tag-dodge border-tag-dodge/50',
  dispel: 'bg-tag-dispel/20 text-tag-dispel border-tag-dispel/50',
  tank: 'bg-tag-tank/20 text-tag-tank border-tag-tank/50',
  soak: 'bg-tag-soak/20 text-tag-soak border-tag-soak/50',
  ignore: 'bg-ink-800 text-ink-400 border-ink-700',
  todo: 'bg-ink-800 text-ink-600 border-ink-700',
}

export function TagBadge({ tag, prio }: { tag?: SpellTag; prio?: number }) {
  const { t } = useI18n()
  if (!tag || tag === 'todo') return null
  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${TAG_STYLE[tag]}`}
    >
      {t(`tag.${tag}`)}
      {prio ? ` ${prio}` : ''}
    </span>
  )
}

/** Applicable CC, exactly as MDT declares them. Nothing typed by hand. */
export function CcBadges({ cc }: { cc: string[] }) {
  if (!cc.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {cc.map((c) => (
        <span key={c} className="rounded border border-ink-700 bg-ink-800 px-1.5 py-0.5 text-[10px] text-ink-300">
          {c}
        </span>
      ))}
    </div>
  )
}

export function DispelBadges({ dispel }: { dispel?: string[] }) {
  if (!dispel?.length) return null
  return (
    <>
      {dispel.map((d) => (
        <span
          key={d}
          className="shrink-0 rounded border border-tag-dispel/40 bg-tag-dispel/10 px-1.5 py-0.5 text-[10px] text-tag-dispel"
        >
          {d}
        </span>
      ))}
    </>
  )
}

/**
 * Says the text beside it is still in the base language.
 *
 * The card keeps showing the English note rather than swapping it for Wowhead's French
 * description: the note is a judgement about the pull and the description is a tooltip, so
 * losing the note would cost the reader more than the language does. What the mark adds is
 * that they can tell — and that the gap reads as ours to close rather than as their mistake.
 *
 * Its text is the base locale, not the word "English": one place decides which language the
 * codex is written in first, and it is `DEFAULT_LOCALE`.
 */
export function BaseLanguageMark() {
  const { t } = useI18n()
  return (
    <span
      title={t('mob.untranslated')}
      className="shrink-0 rounded border border-ink-600 px-1 text-[9px] font-bold tracking-wider text-ink-500"
    >
      {DEFAULT_LOCALE.toUpperCase()}
    </span>
  )
}
