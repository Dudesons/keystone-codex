import type { Enemy } from '../../lib/types'
import { getSpell, iconUrl, portraitUrl } from '../../lib/data'
import { getMobContent, type SpellNote } from '../../lib/content'
import { getIndicators } from '../../lib/indicators'
import { CcBadges, DispelBadges, TagBadge, ThreatBadge } from './Badges'

/** Ordre d'affichage : ce qui demande une réaction immédiate d'abord. */
const TAG_ORDER = ['kick', 'dispel', 'tank', 'dodge', 'soak', 'todo', 'ignore']

interface Props {
  slug: string
  enemy: Enemy
  /** Compacte : utilisée dans les listes. */
  compact?: boolean
  /** Index du pull qui contient ce mob dans la route courante, s'il y en a une. */
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
  const content = getMobContent(slug, enemy.id)
  const ind = getIndicators(slug, enemy)
  const notes = new Map<number, SpellNote>((content?.spells ?? []).map((s) => [Number(s.id), s]))

  const spells = [...enemy.spells].sort((a, b) => {
    const na = notes.get(a.id)
    const nb = notes.get(b.id)
    // Un sort interruptible connu de MDT remonte même sans annotation manuelle.
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
              title={`Pull ${pullIndex + 1}`}
            >
              {pullIndex + 1}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold text-ink-100">{enemy.name}</h3>
            {enemy.isBoss && <span className="text-xs font-semibold text-gold-400">BOSS</span>}
            <ThreatBadge threat={content?.threat} />
            {ind.kick && <Pill color="#d64550">KICK</Pill>}
            {ind.tankBuster && <Pill color="#4a90c2">TANK</Pill>}
            {ind.dispel.map((d) => (
              <Pill key={d} color="#7f6fd0">
                {d.toUpperCase()}
              </Pill>
            ))}
          </div>
          <div className="mt-0.5 text-xs text-ink-400">
            {enemy.count > 0 ? `${enemy.count} forces` : 'aucune force'} · {enemy.clones.length} unité
            {enemy.clones.length > 1 ? 's' : ''}
            {enemy.creatureType ? ` · ${enemy.creatureType}` : ''}
            {content?.role ? ` · ${content.role}` : ''}
          </div>
        </div>
      </header>

      {content?.trap && (
        <div className="mx-3 mb-3 rounded border-l-2 border-threat-lethal bg-threat-lethal/10 px-3 py-2">
          <div className="text-[10px] font-bold tracking-widest text-threat-lethal">LE PIÈGE</div>
          <p className="mt-0.5 text-sm text-ink-100">{content.trap}</p>
        </div>
      )}

      {!compact && enemy.cc.length > 0 && (
        <div className="px-3 pb-3">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-ink-400">CC APPLICABLES</div>
          <CcBadges cc={enemy.cc} />
        </div>
      )}

      {!compact && enemy.cc.length === 0 && (
        <div className="px-3 pb-3 text-xs text-ink-400">Immunisé à tous les CC listés par MDT.</div>
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
              compact={compact}
            />
          ))}
        </div>
      )}

      {!compact && content?.html && (
        <div
          className="prose-codex border-t border-ink-700 px-3 py-3"
          dangerouslySetInnerHTML={{ __html: content.html }}
        />
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
  compact,
}: {
  spellId: number
  dispel?: string[]
  interruptible?: boolean
  note?: SpellNote
  compact: boolean
}) {
  const spell = getSpell(spellId)
  const name = spell?.name ?? `Sort ${spellId}`
  const text = note?.note || (compact ? undefined : spell?.description)

  return (
    <div className="flex gap-2.5 px-3 py-2 hover:bg-ink-800/60">
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
            href={`https://www.wowhead.com/spell=${spellId}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-ink-100 hover:text-gold-400"
            onClick={(e) => e.stopPropagation()}
          >
            {name}
          </a>
          <TagBadge tag={note?.tag} prio={note?.prio} />
          {/* Sans annotation manuelle, on affiche quand même ce que MDT sait. */}
          {interruptible && (!note?.tag || note.tag === 'todo') && <Pill color="#d64550">KICK</Pill>}
          <DispelBadges dispel={dispel} />
          {spell?.castTime && <span className="text-[11px] text-ink-400">{spell.castTime}</span>}
        </div>
        {text && <p className="mt-0.5 text-xs leading-snug text-ink-400">{text}</p>}
      </div>
    </div>
  )
}
