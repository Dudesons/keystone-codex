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

export type Threat = 'low' | 'medium' | 'high' | 'lethal'
export type SpellTag = 'kick' | 'dodge' | 'dispel' | 'tank' | 'soak' | 'ignore' | 'todo'

export interface SpellNote {
  id: number
  tag?: SpellTag
  prio?: number
  note?: string
}

export interface MobContent {
  npcId: number
  threat?: Threat
  role?: string
  trap?: string
  spells?: SpellNote[]
  /** Markdown body already converted to HTML. */
  html: string
  /** True as long as the file has received no writing at all. */
  isStub: boolean
}

export interface DungeonContent {
  timer?: string
  summary?: string
  html: string
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

function splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
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
  trap?: string
  spells?: SpellNote[]
  prose: string
}

interface RawDungeon {
  timer?: string
  summary?: string
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
    trap: data.trap as string | undefined,
    spells: (data.spells as SpellNote[] | undefined)?.filter((s) => s && Number(s.id)),
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

function mergeMob(base?: RawMob, translation?: RawMob): MobContent | undefined {
  const source = translation ?? base
  if (!source) return undefined

  const prose = translation?.prose || base?.prose || ''
  const spells = mergeSpells(base?.spells, translation?.spells)
  const trap = translation?.trap ?? base?.trap
  const threat = translation?.threat ?? base?.threat

  return {
    npcId: source.npcId,
    threat,
    role: translation?.role ?? base?.role,
    trap,
    spells,
    html: render(prose),
    // A card counts as written as soon as a human has put a judgement in it: threat, trap,
    // prose, or at least one annotated spell.
    isStub:
      !prose &&
      !trap &&
      !threat &&
      !spells?.some((s) => s.note || (s.tag && s.tag !== 'todo')),
  }
}

function mergeDungeon(base?: RawDungeon, translation?: RawDungeon): DungeonContent | undefined {
  if (!base && !translation) return undefined
  return {
    timer: translation?.timer ?? base?.timer,
    summary: translation?.summary ?? base?.summary,
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
    ? mergeMob(byLocale[DEFAULT_LOCALE], locale === DEFAULT_LOCALE ? undefined : byLocale[locale])
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
