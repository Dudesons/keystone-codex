// ABOUTME: A mob's card: portrait, threat, forces, trap, applicable CC and its spell list.
// ABOUTME: Spells are ordered by what needs an immediate reaction, then by declared priority.

import type { Enemy } from '../../lib/types'
import { getLookup, getNpcLabel, getSpell, iconUrl, portraitUrl, wowheadUrl } from '../../lib/data'
import { getMobContent, inlineMarkdown, isRole, type SpellNote, type SpellTag } from '../../lib/content'
import { getIndicators } from '../../lib/indicators'
import { useI18n } from '../../lib/i18n/context'
import { BaseLanguageMark, CcBadges, DispelBadges, TagBadge, ThreatBadge } from './Badges'

/**
 * Display order: whatever demands an immediate reaction comes first.
 *
 * Typed `SpellTag[]` so the compiler names a tag left out of this list. Absent from it, a tag
 * would `indexOf` to -1 and sort silently above everything else.
 */
const TAG_ORDER: SpellTag[] = ['kick', 'frontal', 'dispel', 'tank', 'dodge', 'soak', 'todo', 'ignore']

interface Props {
  slug: string
  enemy: Enemy
  /** Compact: used in lists. */
  compact?: boolean
  /** Index of the pull containing this mob in the current route, if there is one. */
  pullIndex?: number
  pullColor?: string
  onHover?: (npcId: number | null) => void
  onSelect?: (npcId: number) => void
}

export default function MobCard({
  slug,
  enemy,
  compact = false,
  pullIndex,
  pullColor,
  onHover,
  onSelect,
}: Props) {
  const { t, plural, locale } = useI18n()
  const content = getMobContent(slug, enemy.id, locale)
  const ind = getIndicators(slug, enemy, locale)
  const label = getNpcLabel(enemy, locale)
  const notes = new Map<number, SpellNote>((content?.spells ?? []).map((s) => [Number(s.id), s]))
  // An unknown dungeon is one more dungeon we hold no CC for: absent data never reads as immunity.
  const hasCcData = getLookup(slug)?.hasCcData ?? false

  const spells = [...enemy.spells].sort((a, b) => {
    const na = notes.get(a.id)
    const nb = notes.get(b.id)
    // A spell MDT knows to be interruptible rises even without a manual annotation.
    const ta = TAG_ORDER.indexOf(na?.tag ?? (a.interruptible ? 'kick' : 'todo'))
    const tb = TAG_ORDER.indexOf(nb?.tag ?? (b.interruptible ? 'kick' : 'todo'))
    if (ta !== tb) return ta - tb
    return (na?.prio ?? 99) - (nb?.prio ?? 99)
  })

  return (
    <article
      data-npc={enemy.id}
      className="scroll-mt-2 rounded-lg border border-ink-700 bg-ink-850"
      onMouseEnter={() => onHover?.(enemy.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <header
        className={`flex items-start gap-3 p-3 ${onSelect ? 'cursor-pointer hover:bg-ink-800' : ''}`}
        onClick={() => onSelect?.(enemy.id)}
      >
        <div className="relative shrink-0">
          {enemy.displayId ? (
            <img
              src={portraitUrl(enemy.displayId)}
              alt=""
              loading="lazy"
              className="h-12 w-12 rounded-full border-2 bg-ink-900 object-cover"
              style={{ borderColor: ind.ring }}
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden'
              }}
            />
          ) : (
            <div className="h-12 w-12 rounded-full border-2 bg-ink-900" style={{ borderColor: ind.ring }} />
          )}
          {pullIndex !== undefined && (
            <span
              className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-ink-950"
              style={{ background: pullColor ?? '#e0b552' }}
              title={t('mob.pull', { n: pullIndex + 1 })}
            >
              {pullIndex + 1}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold text-ink-100">{label.name}</h3>
            {enemy.isBoss && <span className="text-xs font-semibold text-gold-400">{t('mob.boss')}</span>}
            <ThreatBadge threat={content?.threat} />
            {ind.kick && <Pill color="#d64550">{t('tag.kick')}</Pill>}
            {ind.tankBuster && <Pill color="#4a90c2">{t('tag.tank')}</Pill>}
            {ind.dispel.map((d) => (
              <Pill key={d} color="#7f6fd0">
                {d.toUpperCase()}
              </Pill>
            ))}
          </div>
          <div className="mt-0.5 text-xs text-ink-400">
            {enemy.count > 0 ? plural('common.forces', enemy.count) : t('common.noForce')} ·{' '}
            {plural('common.units', enemy.clones.length)}
            {label.type ? ` · ${label.type}` : ''}
            {/* A role outside the known vocabulary is shown as written: a hand-typed entry
                must never surface a raw translation key. */}
            {content?.role
              ? ` · ${isRole(content.role) ? t(`role.${content.role}`) : content.role}`
              : ''}
          </div>
        </div>
      </header>

      {content?.trap && (
        <div className="mx-3 mb-3 rounded border-l-2 border-threat-lethal bg-threat-lethal/10 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <div className="text-[10px] font-bold tracking-widest text-threat-lethal">{t('mob.trap')}</div>
            {content.fallback.trap && <BaseLanguageMark />}
          </div>
          <p
            className="mt-0.5 text-sm text-ink-100"
            dangerouslySetInnerHTML={{ __html: inlineMarkdown(content.trap) }}
          />
        </div>
      )}

      {!compact && enemy.cc.length > 0 && (
        <div className="px-3 pb-3">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-ink-400">
            {t('mob.ccApplicable')}
          </div>
          <CcBadges cc={enemy.cc} />
        </div>
      )}

      {!compact && enemy.cc.length === 0 && (
        <div className="px-3 pb-3 text-xs text-ink-400">
          {t(hasCcData ? 'mob.ccImmune' : 'mob.ccUnknown')}
        </div>
      )}

      {spells.length > 0 && (
        <div className="border-t border-ink-700">
          {spells.map((s) => (
            <SpellRow
              key={s.id}
              spellId={s.id}
              dispel={s.dispel}
              interruptible={s.interruptible}
              note={notes.get(s.id)}
              noteInBaseLanguage={content?.fallback.notes.includes(s.id) ?? false}
              compact={compact}
            />
          ))}
        </div>
      )}

      {!compact && content?.html && (
        <div className="border-t border-ink-700 px-3 py-3">
          {content.fallback.prose && (
            <div className="mb-1.5 flex justify-end">
              <BaseLanguageMark />
            </div>
          )}
          <div className="prose-codex" dangerouslySetInnerHTML={{ __html: content.html }} />
        </div>
      )}
    </article>
  )
}

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide"
      style={{ color, borderColor: `${color}80`, background: `${color}26` }}
    >
      {children}
    </span>
  )
}

function SpellRow({
  spellId,
  dispel,
  interruptible,
  note,
  noteInBaseLanguage,
  compact,
}: {
  spellId: number
  dispel?: string[]
  interruptible?: boolean
  note?: SpellNote
  /** The note fell back to the base language: mark it, but only once it is what we show. */
  noteInBaseLanguage: boolean
  compact: boolean
}) {
  const { t, locale } = useI18n()
  const spell = getSpell(spellId, locale)
  const name = spell?.name ?? t('mob.unknownSpell', { id: spellId })
  // Our note is authored markdown; Wowhead's description is data and is shown as it came.
  const written = inlineMarkdown(note?.note)
  const text = written || (compact ? undefined : spell?.description)

  return (
    // `data-spell` rather than an `id`: the panel's list view renders every mob at once, and
    // two of them sharing a spell would share a document id. It is what a briefing chip's
    // `#spell-<id>` hash resolves against.
    <div data-spell={spellId} className="flex gap-2.5 px-3 py-2 hover:bg-ink-800/60">
      {spell?.icon ? (
        <img
          src={iconUrl(spell.icon)}
          alt=""
          loading="lazy"
          className="mt-0.5 h-7 w-7 shrink-0 rounded border border-ink-600"
        />
      ) : (
        <div className="mt-0.5 h-7 w-7 shrink-0 rounded border border-ink-700 bg-ink-800" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <a
            href={wowheadUrl(spellId, locale)}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-ink-100 hover:text-gold-400"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </a>
          <TagBadge tag={note?.tag} prio={note?.prio} />
          {/* With no manual annotation, we still show what MDT knows. */}
          {interruptible && (!note?.tag || note.tag === 'todo') && (
            <Pill color="#d64550">{t('tag.kick')}</Pill>
          )}
          <DispelBadges dispel={dispel} />
          {spell?.castTime && <span className="text-[11px] text-ink-400">{spell.castTime}</span>}
          {/* Conditioned on `written`, not on the note existing: a compact row hides the note,
              and a row showing Wowhead's description alone is already in the right language. */}
          {noteInBaseLanguage && written && <BaseLanguageMark />}
        </div>
        {text &&
          (written ? (
            <p
              className="mt-0.5 text-xs leading-snug text-ink-400"
              dangerouslySetInnerHTML={{ __html: written }}
            />
          ) : (
            <p className="mt-0.5 text-xs leading-snug text-ink-400">{text}</p>
          ))}
      </div>
    </div>
  )
}
