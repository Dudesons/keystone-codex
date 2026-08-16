import { describe, expect, it } from 'vitest'
import { contentProgress, getDungeonContent, getMobContent } from './content'

/**
 * Ces tests lisent les vrais fichiers de `content/`. Deux fiches servent de repères :
 * l'une est rédigée, l'autre est un gabarit intact tel que `npm run scaffold` le produit.
 */
const SLUG = 'altar-of-fangs'
const REDIGEE = 270306 // Ritual Chieftain
const GABARIT = 259445 // Rav'i
const SANS_FICHE = 999_999

describe('Fiche de mob rédigée', () => {
  const fiche = getMobContent(SLUG, REDIGEE)

  it('existe et porte son npcId', () => {
    expect(fiche).toBeDefined()
    expect(fiche!.npcId).toBe(REDIGEE)
  })

  it('lit le jugement humain du frontmatter', () => {
    expect(fiche!.threat).toBe('high')
    expect(fiche!.role).toBe('melee')
    expect(fiche!.trap).toContain('Immune to every CC')
  })

  it('conserve les annotations de sorts avec leur tag et leur priorité', () => {
    const dismember = fiche!.spells?.find((s) => s.id === 1306911)
    expect(dismember).toMatchObject({ tag: 'tank', prio: 1 })
    expect(dismember!.note).toContain('581k')
  })

  it('convertit la prose en HTML', () => {
    expect(fiche!.html).toContain('<p>')
    expect(fiche!.html).toContain('<strong>Dismember</strong>')
  })

  it('n\'émet pas les commentaires HTML d\'aide dans le rendu', () => {
    expect(fiche!.html).not.toContain('<!--')
    expect(fiche!.html).not.toContain('To confirm in game')
  })

  it('ne compte pas comme gabarit', () => {
    expect(fiche!.isStub).toBe(false)
  })
})

describe('Gabarit non rédigé', () => {
  const gabarit = getMobContent(SLUG, GABARIT)

  it('est chargé malgré l\'absence de rédaction', () => {
    expect(gabarit).toBeDefined()
    expect(gabarit!.npcId).toBe(GABARIT)
  })

  it('n\'invente aucun jugement : ni menace, ni piège, ni prose', () => {
    expect(gabarit!.threat).toBeFalsy()
    expect(gabarit!.trap).toBeFalsy()
    expect(gabarit!.html.trim()).toBe('')
  })

  it('est marqué comme gabarit : `tag: todo` ne vaut pas rédaction', () => {
    expect(gabarit!.isStub).toBe(true)
    expect(gabarit!.spells?.every((s) => s.tag === 'todo')).toBe(true)
  })
})

describe('Mob sans fichier', () => {
  it('renvoie undefined plutôt que d\'échouer — le codex se remplit progressivement', () => {
    expect(getMobContent(SLUG, SANS_FICHE)).toBeUndefined()
  })

  it('renvoie undefined pour un donjon inconnu', () => {
    expect(getMobContent('donjon-inexistant', REDIGEE)).toBeUndefined()
  })
})

describe('Fiche de donjon', () => {
  it('charge `_dungeon.md` et rend son plan de route', () => {
    const dungeon = getDungeonContent(SLUG)
    expect(dungeon).toBeDefined()
    expect(dungeon!.html).toContain('Route plan')
  })

  it('laisse chrono et résumé vides tant qu\'ils ne sont pas renseignés', () => {
    const dungeon = getDungeonContent(SLUG)!
    expect(dungeon.timer).toBeFalsy()
    expect(dungeon.summary).toBeFalsy()
  })

  it('renvoie undefined pour un donjon inconnu', () => {
    expect(getDungeonContent('donjon-inexistant')).toBeUndefined()
  })
})

/**
 * Le Ritual Chieftain est la fiche bilingue de référence : base anglaise
 * (`270306-ritual-chieftain.md`) et traduction française (`.fr.md`) qui ne reprend que le
 * texte. C'est ce couple qui exerce la fusion champ par champ.
 */
describe('Fiche traduite', () => {
  const base = getMobContent(SLUG, REDIGEE, 'en')!
  const traduite = getMobContent(SLUG, REDIGEE, 'fr')!

  it('reprend le texte de la traduction', () => {
    expect(traduite.trap).toContain('Immunisé à tous les CC')
    expect(traduite.html).toContain('séquence qui tue')
  })

  it('hérite des jugements de la base, que la traduction ne redit pas', () => {
    // `threat`, `role`, `tag` et `prio` n'apparaissent pas dans le .fr.md : les dupliquer
    // serait la garantie qu'ils divergent un jour.
    expect(traduite.threat).toBe('high')
    expect(traduite.role).toBe('melee')
    expect(traduite.spells?.find((s) => s.id === 1306911)).toMatchObject({ tag: 'tank', prio: 1 })
  })

  it('fusionne les notes de sorts par id', () => {
    const dismemberFr = traduite.spells?.find((s) => s.id === 1306911)
    const dismemberEn = base.spells?.find((s) => s.id === 1306911)
    expect(dismemberFr!.note).toContain('581k physique')
    expect(dismemberEn!.note).toContain('581k physical')
    expect(traduite.spells).toHaveLength(base.spells!.length)
  })

  it('reste rédigée dans les deux langues', () => {
    expect(base.isStub).toBe(false)
    expect(traduite.isStub).toBe(false)
  })
})

describe('Retombée sur la langue de base', () => {
  it('sert la fiche de base quand la traduction manque', () => {
    // Rav'i n'a pas de .fr.md : le lecteur francophone voit la base plutôt qu'un trou.
    expect(getMobContent(SLUG, GABARIT, 'fr')).toEqual(getMobContent(SLUG, GABARIT, 'en'))
  })

  it('sert le plan de donjon de base dans les deux langues', () => {
    expect(getDungeonContent(SLUG, 'fr')!.html).toBe(getDungeonContent(SLUG, 'en')!.html)
  })

  it('ne fabrique rien pour un mob sans aucun fichier', () => {
    expect(getMobContent(SLUG, SANS_FICHE, 'fr')).toBeUndefined()
  })
})

describe('contentProgress', () => {
  it('ne compte que les fiches portant une rédaction', () => {
    expect(contentProgress(SLUG, [REDIGEE, GABARIT])).toEqual({ written: 1, total: 2 })
  })

  it('compte ce que le lecteur voit : la retombée sur la base compte comme lisible', () => {
    expect(contentProgress(SLUG, [REDIGEE, GABARIT], 'fr')).toEqual({ written: 1, total: 2 })
  })

  it('compte un mob sans fichier comme non rédigé', () => {
    expect(contentProgress(SLUG, [SANS_FICHE])).toEqual({ written: 0, total: 1 })
  })

  it('renvoie un total nul pour une liste vide', () => {
    expect(contentProgress(SLUG, [])).toEqual({ written: 0, total: 0 })
  })
})
