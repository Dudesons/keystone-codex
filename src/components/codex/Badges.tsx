import type { Threat, SpellTag } from '../../lib/content'
import { useI18n } from '../../lib/i18n/context'

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
