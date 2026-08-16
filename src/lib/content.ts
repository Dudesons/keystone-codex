/**
 * Chargement du contenu éditorial (`content/**.md`).
 *
 * Tout ce qui est mécanique (nom, forces, CC, sorts) vient de MDT ; ces fichiers ne portent
 * que ce qu'un humain apporte : niveau de menace, ce qu'il faut kick, le piège du pack, la
 * prose. Un mob sans fichier reste affiché avec ses seules données MDT, donc le codex peut
 * se remplir progressivement sans jamais casser l'app.
 *
 * Vite recharge ces modules à chaud : éditer un .md met la fiche à jour sans rebuild.
 */

import { parse as parseYaml } from 'yaml'
import { marked } from 'marked'

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
  /** Corps markdown déjà converti en HTML. */
  html: string
  /** Vrai tant que le fichier n'a reçu aucune rédaction. */
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
    console.error('Frontmatter YAML invalide :', err)
    return { data: {}, body: m[2] }
  }
}

const render = (body: string) => marked.parse(body.trim(), { async: false }) as string

/** `../../content/<slug>/<fichier>.md` */
const files = import.meta.glob<string>('../../content/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const mobContent = new Map<string, MobContent>()
const dungeonContent = new Map<string, DungeonContent>()

for (const [filePath, raw] of Object.entries(files)) {
  const m = /content\/([^/]+)\/(.+)\.md$/.exec(filePath)
  if (!m) continue
  const [, slug, name] = m
  const { data, body } = splitFrontmatter(raw)

  if (name === '_dungeon') {
    dungeonContent.set(slug, {
      timer: data.timer as string | undefined,
      summary: data.summary as string | undefined,
      html: render(body),
    })
    continue
  }

  const npcId = Number(data.npcId)
  if (!npcId) {
    console.warn(`${filePath} : champ npcId manquant, fichier ignoré`)
    continue
  }

  // Les gabarits générés ne contiennent que des commentaires HTML d'aide : ils ne comptent
  // pas comme de la rédaction.
  const prose = body.replace(/<!--[\s\S]*?-->/g, '').trim()
  const spells = (data.spells as SpellNote[] | undefined)?.filter((s) => s && Number(s.id))

  mobContent.set(`${slug}/${npcId}`, {
    npcId,
    threat: data.threat as Threat | undefined,
    role: data.role as string | undefined,
    trap: data.trap as string | undefined,
    spells,
    html: render(prose),
    // Une fiche compte comme rédigée dès qu'un humain y a mis un jugement : menace, piège,
    // prose, ou au moins un sort annoté.
    isStub:
      !prose &&
      !data.trap &&
      !data.threat &&
      !spells?.some((s) => s.note || (s.tag && s.tag !== 'todo')),
  })
}

export function getMobContent(slug: string, npcId: number): MobContent | undefined {
  return mobContent.get(`${slug}/${npcId}`)
}

export function getDungeonContent(slug: string): DungeonContent | undefined {
  return dungeonContent.get(slug)
}

/** Part des mobs du donjon qui ont une fiche rédigée — sert d'indicateur de complétion. */
export function contentProgress(slug: string, npcIds: number[]): { written: number; total: number } {
  const written = npcIds.filter((id) => {
    const c = mobContent.get(`${slug}/${id}`)
    return c && !c.isStub
  }).length
  return { written, total: npcIds.length }
}
