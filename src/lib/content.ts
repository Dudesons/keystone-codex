// ABOUTME: Loads the written entries from content/**.md and merges a translation over its base.
// ABOUTME: A mob with no entry, or no translation, still renders — the codex fills in gradually.

/**
 * Loading the written content (`content/**.md`).
 *
 * Everything mechanical (name, forces, CC, spells) comes from MDT; these files carry only
 * what a human brings: threat level, what to interrupt, the trap of the pack, the prose. A
 * mob without a file is still displayed with its MDT data alone, so the codex can fill in
 * gradually without ever breaking the app.
 *
 * Vite hot-reloads these modules: editing a .md updates the card without a rebuild.
 *
 * ## Languages
 *
 * `<name>.md` holds the base language, `<name>.fr.md` a translation. A translation is
 * layered over the base field by field rather than replacing it: `threat`, `role`, `tag` and
 * `prio` are judgements, not text, so duplicating them across both files would only let them
 * drift. Translating a card therefore means writing `note`, `trap` and the prose — anything
 * left out falls back to the base.
 */

import { parse as parseYaml } from 'yaml'
import { marked } from 'marked'
import { DEFAULT_LOCALE, isLocale, type Locale } from './i18n/locales'
import { parseTips, type Tip } from './tips'

export type Threat = 'low' | 'medium' | 'high' | 'lethal'

/**
 * The roles the scaffold template offers, and the only ones the UI knows how to translate.
 *
 * `role` stays free text in `MobContent`: the frontmatter is hand-written, and a typo or a
 * word we never planned must render as itself rather than as a missing translation key.
 * `isRole` is the guard that decides which of the two happens.
 */
export const ROLES = ['caster', 'melee', 'patrol', 'add'] as const

export type Role = (typeof ROLES)[number]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/**
 * A mob's rank: how much of a deal it is, as opposed to `role`, which is what shape it is.
 *
 * Unlike `role` this is **not** free text. `role` is displayed, so an unknown value renders as
 * itself and the reader sees the word someone wrote. `rank` is never displayed as text — it
 * decides which list a mob appears in — so an unknown value is dropped and MDT's own `isBoss`
 * stands. `content.integrity.test.ts` is what turns that silent fallback into a failing test.
 */
export const RANKS = ['boss', 'miniboss'] as const

export type Rank = (typeof RANKS)[number]

export function isRank(value: unknown): value is Rank {
  return typeof value === 'string' && (RANKS as readonly string[]).includes(value)
}

/**
 * `frontal` is narrower than `dodge` on purpose: a cone you leave by not standing in front,
 * rather than something on the floor to walk out of. It is the only one of these the pull
 * briefing prints, so the distinction decides what a router reads.
 */
export type SpellTag = 'kick' | 'frontal' | 'dodge' | 'dispel' | 'tank' | 'soak' | 'ignore' | 'todo'

export interface SpellNote {
  id: number
  tag?: SpellTag
  prio?: number
  note?: string
}

/**
 * Which of a card's text fields the reader is being served in the base language.
 *
 * The merge falls back field by field, which is what lets a translation land one sentence at a
 * time — but it also means a card can be half translated with nothing on screen saying so. A
 * spell note matters most here, because the card shows it *instead of* Wowhead's description:
 * an untranslated note hides a French description that exists.
 *
 * Empty whenever the reader asked for the base language, and whenever the field is empty in
 * both — there is no fallback in serving nothing.
 */
export interface MobFallback {
  trap: boolean
  prose: boolean
  /** The reader is being served the base language's tips, because the translation names none. */
  tips: boolean
  /** Ids whose note still reads in the base language. */
  notes: number[]
}

export interface MobContent {
  npcId: number
  threat?: Threat
  role?: string
  rank?: Rank
  trap?: string
  spells?: SpellNote[]
  tips?: Tip[]
  /** Markdown body already converted to HTML. */
  html: string
  /** True as long as the file has received no writing at all. */
  isStub: boolean
  fallback: MobFallback
}

export interface DungeonContent {
  timer?: string
  summary?: string
  /** Boss npcIds in encounter order, where `mdtIdx` gets it wrong. */
  bosses?: number[]
  html: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

/** Exported for the integrity test, which reads the same frontmatter straight off disk. */
export function splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = FRONTMATTER.exec(raw)
  if (!m) return { data: {}, body: raw }
  try {
    return { data: (parseYaml(m[1]) as Record<string, unknown>) ?? {}, body: m[2] }
  } catch (err) {
    console.error('Invalid YAML frontmatter:', err)
    return { data: {}, body: m[2] }
  }
}

const render = (body: string) => marked.parse(body.trim(), { async: false }) as string

/**
 * Markdown for the one-line fields — `trap` and a spell's `note`.
 *
 * Inline rather than block: these are sentences rendered inside a paragraph the component
 * already lays out, so a `<p>` wrapper would fight the surrounding styling. Emphasis and
 * links work; headings and lists do not, which is the right constraint for a single sentence.
 */
export const inlineMarkdown = (text?: string) =>
  text ? (marked.parseInline(text.trim(), { async: false }) as string) : ''

/** `../../content/<slug>/<file>.md`, with an optional `.<locale>` before the extension. */
const files = import.meta.glob<string>('../../content/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

/**
 * Splits `134251-seneschal-mbara.fr` into a name and a locale.
 *
 * The locale is matched against the known list rather than "any two letters": a mob slug can
 * legitimately end in a two-letter segment, and `_dungeon.md` must not be read as a file
 * named `_dungeon` in some language called `md`.
 */
function splitLocale(name: string): { name: string; locale: Locale } {
  const cut = name.lastIndexOf('.')
  if (cut > 0) {
    const suffix = name.slice(cut + 1)
    if (isLocale(suffix)) return { name: name.slice(0, cut), locale: suffix }
  }
  return { name, locale: DEFAULT_LOCALE }
}

/** One parsed file, before any merging. */
interface RawMob {
  npcId: number
  threat?: Threat
  role?: string
  rank?: Rank
  trap?: string
  spells?: SpellNote[]
  tips?: Tip[]
  prose: string
}

interface RawDungeon {
  timer?: string
  summary?: string
  bosses?: number[]
  prose: string
}

type ByLocale<T> = Partial<Record<Locale, T>>

const mobFiles = new Map<string, ByLocale<RawMob>>()
const dungeonFiles = new Map<string, ByLocale<RawDungeon>>()

function slot<T>(store: Map<string, ByLocale<T>>, key: string): ByLocale<T> {
  const hit = store.get(key)
  if (hit) return hit
  const fresh: ByLocale<T> = {}
  store.set(key, fresh)
  return fresh
}

for (const [filePath, raw] of Object.entries(files)) {
  const m = /content\/([^/]+)\/(.+)\.md$/.exec(filePath)
  if (!m) continue
  const [, slug, rawName] = m
  const { name, locale } = splitLocale(rawName)
  const { data, body } = splitFrontmatter(raw)

  // Generated templates only contain HTML help comments: they do not count as writing.
  const prose = body.replace(/<!--[\s\S]*?-->/g, '').trim()

  if (name === '_dungeon') {
    slot(dungeonFiles, slug)[locale] = {
      timer: data.timer as string | undefined,
      summary: data.summary as string | undefined,
      bosses: npcIdList(data.bosses),
      prose,
    }
    continue
  }

  const npcId = Number(data.npcId)
  if (!npcId) {
    console.warn(`${filePath}: missing npcId field, file ignored`)
    continue
  }

  slot(mobFiles, `${slug}/${npcId}`)[locale] = {
    npcId,
    threat: data.threat as Threat | undefined,
    role: data.role as string | undefined,
    rank: isRank(data.rank) ? data.rank : undefined,
    trap: data.trap as string | undefined,
    spells: (data.spells as SpellNote[] | undefined)?.filter((s) => s && Number(s.id)),
    tips: parseTips(data.tips, filePath),
    prose,
  }
}

/** Spell notes merge by id: a translation can rewrite a note without restating the others. */
function mergeSpells(base?: SpellNote[], translation?: SpellNote[]): SpellNote[] | undefined {
  if (!translation) return base
  if (!base) return translation

  const merged = new Map<number, SpellNote>(base.map((s) => [Number(s.id), s]))
  for (const note of translation) {
    const id = Number(note.id)
    const previous = merged.get(id)
    merged.set(id, previous ? { ...previous, ...definedOnly(note) } : note)
  }
  return [...merged.values()]
}

/** A key left empty in a translation means "keep the base", not "erase it". */
function definedOnly<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined && v !== null),
  ) as Partial<T>
}

/**
 * `bosses:` is hand-written YAML: an empty field parses to `null`, a typo to a string. Only a
 * non-empty list of positive ids is worth anything downstream, so everything else becomes
 * "not declared" rather than a half-valid array the ordering code would have to re-check.
 */
export function npcIdList(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const ids = value.map(Number).filter((n) => Number.isFinite(n) && n > 0)
  return ids.length ? ids : undefined
}

/**
 * Which fields the merge above resolved out of the base rather than out of the translation.
 *
 * Each test mirrors the expression that picked the value, so the two cannot disagree: a field
 * the translation leaves out and a translation that does not exist are the same condition, and
 * `?.` collapses them into one. A field empty on both sides is not a fallback — nothing is
 * being served in the wrong language when nothing is being served.
 */
function fallbackOf(locale: Locale, base?: RawMob, translation?: RawMob): MobFallback {
  if (locale === DEFAULT_LOCALE) return { trap: false, prose: false, tips: false, notes: [] }

  const translated = new Set(
    (translation?.spells ?? []).filter((s) => s.note).map((s) => Number(s.id)),
  )
  return {
    trap: base?.trap != null && translation?.trap == null,
    prose: Boolean(base?.prose) && !translation?.prose,
    tips: Boolean(base?.tips?.length) && !translation?.tips,
    notes: (base?.spells ?? [])
      .filter((s) => s.note && !translated.has(Number(s.id)))
      .map((s) => Number(s.id)),
  }
}

function mergeMob(base: RawMob | undefined, translation: RawMob | undefined, locale: Locale): MobContent | undefined {
  const source = translation ?? base
  if (!source) return undefined

  const prose = translation?.prose || base?.prose || ''
  const spells = mergeSpells(base?.spells, translation?.spells)
  const trap = translation?.trap ?? base?.trap
  const threat = translation?.threat ?? base?.threat
  const tips = translation?.tips ?? base?.tips

  return {
    npcId: source.npcId,
    threat,
    role: translation?.role ?? base?.role,
    rank: translation?.rank ?? base?.rank,
    trap,
    spells,
    tips,
    html: render(prose),
    // A card counts as written as soon as a human has put a judgement in it: threat, trap,
    // prose, a tip, or at least one annotated spell.
    isStub:
      !prose &&
      !trap &&
      !threat &&
      !tips?.length &&
      !spells?.some((s) => s.note || (s.tag && s.tag !== 'todo')),
    fallback: fallbackOf(locale, base, translation),
  }
}

function mergeDungeon(base?: RawDungeon, translation?: RawDungeon): DungeonContent | undefined {
  if (!base && !translation) return undefined
  return {
    timer: translation?.timer ?? base?.timer,
    summary: translation?.summary ?? base?.summary,
    bosses: translation?.bosses ?? base?.bosses,
    html: render(translation?.prose || base?.prose || ''),
  }
}

// Merging and rendering markdown on every call would be wasteful: the codex panel asks for
// the same cards on each render. Keyed by locale, since the result depends on it.
const mobCache = new Map<string, MobContent | undefined>()
const dungeonCache = new Map<string, DungeonContent | undefined>()

export function getMobContent(
  slug: string,
  npcId: number,
  locale: Locale = DEFAULT_LOCALE,
): MobContent | undefined {
  const key = `${locale}/${slug}/${npcId}`
  if (mobCache.has(key)) return mobCache.get(key)

  const byLocale = mobFiles.get(`${slug}/${npcId}`)
  const merged = byLocale
    ? mergeMob(
        byLocale[DEFAULT_LOCALE],
        locale === DEFAULT_LOCALE ? undefined : byLocale[locale],
        locale,
      )
    : undefined

  mobCache.set(key, merged)
  return merged
}

export function getDungeonContent(
  slug: string,
  locale: Locale = DEFAULT_LOCALE,
): DungeonContent | undefined {
  const key = `${locale}/${slug}`
  if (dungeonCache.has(key)) return dungeonCache.get(key)

  const byLocale = dungeonFiles.get(slug)
  const merged = byLocale
    ? mergeDungeon(
        byLocale[DEFAULT_LOCALE],
        locale === DEFAULT_LOCALE ? undefined : byLocale[locale],
      )
    : undefined

  dungeonCache.set(key, merged)
  return merged
}

/**
 * Share of the dungeon's mobs that have a written card — the completion indicator.
 *
 * Counts what the reader actually sees, fallback included: the bar measures how much of the
 * codex is readable, not how far the translation has got.
 */
export function contentProgress(
  slug: string,
  npcIds: number[],
  locale: Locale = DEFAULT_LOCALE,
): { written: number; total: number } {
  const written = npcIds.filter((id) => {
    const c = getMobContent(slug, id, locale)
    return c && !c.isStub
  }).length
  return { written, total: npcIds.length }
}
