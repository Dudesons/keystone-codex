import { describe, expect, it } from 'vitest'
import {
  cloneKey,
  countForces,
  dungeonList,
  getDungeon,
  getLookup,
  getSpell,
  iconUrl,
  mapUrl,
  parseCloneKey,
  portraitUrl,
  wowheadUrl,
} from './data'
import { MAP_HEIGHT, MAP_WIDTH } from './geometry'
import { DEFAULT_LOCALE } from './i18n/locales'

const SLUG = 'altar-of-fangs'

describe('Index du pool', () => {
  it('expose les donjons de la saison', () => {
    expect(dungeonList.length).toBeGreaterThan(0)
    for (const d of dungeonList) {
      expect(d.slug).toBeTruthy()
      expect(d.mdtIndex).toBeGreaterThan(0)
      expect(d.totalCount).toBeGreaterThan(0)
    }
  })

  it('a un fichier de données pour chaque donjon annoncé', () => {
    for (const d of dungeonList) {
      expect(getDungeon(d.slug), d.slug).toBeDefined()
    }
  })

  it('renvoie undefined pour un donjon inconnu', () => {
    expect(getDungeon('donjon-inexistant')).toBeUndefined()
  })
})

describe('Sorts', () => {
  it('résout un sort extrait de MDT', () => {
    const spell = getSpell(5543)
    expect(spell).toBeDefined()
    expect(spell!.name).toBe('Fade Out')
  })

  it('renvoie undefined pour un sort absent du jeu de données', () => {
    expect(getSpell(999_999_999)).toBeUndefined()
  })

  it('sert le libellé de la langue demandée', () => {
    expect(getSpell(1_306_911, 'en')!.name).toBe('Dismember')
    expect(getSpell(1_306_911, 'fr')!.name).toBe('Démembrer')
  })

  it('localise aussi incantation et description, pas seulement le nom', () => {
    const fr = getSpell(1_306_911, 'fr')!
    expect(fr.castTime).toBe("3 s d'incantation")
    expect(fr.range).toBe('Portée illimitée')
    expect(fr.description).toContain('dégâts physiques')
  })

  it('garde une icône unique quelle que soit la langue', () => {
    expect(getSpell(1_306_911, 'fr')!.icon).toBe(getSpell(1_306_911, 'en')!.icon)
  })

  it('prend la langue par défaut quand on ne précise rien', () => {
    expect(getSpell(1_306_911)).toEqual(getSpell(1_306_911, DEFAULT_LOCALE))
  })
})

describe('wowheadUrl', () => {
  it('n\'ajoute pas de préfixe en anglais : wowhead.com sert l\'anglais à sa racine', () => {
    expect(wowheadUrl(1_306_911, 'en')).toBe('https://www.wowhead.com/spell=1306911')
  })

  it('préfixe la langue pour les autres', () => {
    expect(wowheadUrl(1_306_911, 'fr')).toBe('https://www.wowhead.com/fr/spell=1306911')
  })

  it('retombe sur la langue par défaut sans argument', () => {
    expect(wowheadUrl(1_306_911)).toBe(wowheadUrl(1_306_911, DEFAULT_LOCALE))
  })
})

describe('Clés de clone', () => {
  it('fait un aller-retour', () => {
    expect(parseCloneKey(cloneKey(7, 12))).toEqual({ enemyIdx: 7, cloneIdx: 12 })
  })

  it('produit une clé lisible', () => {
    expect(cloneKey(7, 12)).toBe('7:12')
  })
})

describe('getLookup', () => {
  it('renvoie undefined pour un donjon inconnu', () => {
    expect(getLookup('donjon-inexistant')).toBeUndefined()
  })

  it('mémoïse le résultat', () => {
    expect(getLookup(SLUG)).toBe(getLookup(SLUG))
  })

  it('indexe les mobs par index MDT, jamais par position', () => {
    const lookup = getLookup(SLUG)!
    for (const enemy of lookup.dungeon.enemies) {
      expect(lookup.enemyByIdx.get(enemy.mdtIdx)).toBe(enemy)
    }
  })

  it('indexe aussi les mobs par npcId', () => {
    const lookup = getLookup(SLUG)!
    const first = lookup.dungeon.enemies[0]
    expect(lookup.enemyById.get(first.id)).toBeDefined()
  })
})

describe('Index de clones sparses', () => {
  /**
   * Supprimer un clone dans MDT laisse un trou, et cet index est exactement ce que les routes
   * référencent : le renuméroter casserait silencieusement toutes les routes existantes.
   */
  const troués = dungeonList.flatMap((d) => {
    const dungeon = getDungeon(d.slug)
    if (!dungeon) return []
    return dungeon.enemies
      .filter((e) => e.clones.some((c, i) => c.mdtIdx !== i + 1))
      .map((e) => ({ slug: d.slug, enemy: e }))
  })

  it('le pool contient bien des mobs aux index de clones troués', () => {
    expect(troués.length).toBeGreaterThan(0)
  })

  it('conserve les index tels que MDT les donne, sans recompacter', () => {
    for (const { slug, enemy } of troués) {
      const lookup = getLookup(slug)!
      for (const clone of enemy.clones) {
        expect(
          lookup.cloneByKey.get(cloneKey(enemy.mdtIdx, clone.mdtIdx)),
          `${slug} ${enemy.name} clone ${clone.mdtIdx}`,
        ).toBeDefined()
      }
      // Les positions manquantes ne doivent surtout pas avoir été comblées.
      const présents = new Set(enemy.clones.map((c) => c.mdtIdx))
      const max = Math.max(...présents)
      for (let i = 1; i <= max; i++) {
        if (présents.has(i)) continue
        expect(lookup.cloneByKey.has(cloneKey(enemy.mdtIdx, i))).toBe(false)
      }
    }
  })
})

describe('Packs et clones isolés', () => {
  const lookup = getLookup(SLUG)!

  it('regroupe sous un même `g` les clones qui se pull ensemble', () => {
    expect(lookup.packs.size).toBeGreaterThan(0)
    for (const [g, pack] of lookup.packs) {
      expect(pack.g).toBe(g)
      expect(pack.members.length).toBeGreaterThan(0)
      for (const ref of pack.members) {
        const entry = lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))
        expect(entry).toBeDefined()
        expect(entry!.clone.g).toBe(g)
      }
    }
  })

  it('somme les forces des membres d\'un pack', () => {
    for (const pack of lookup.packs.values()) {
      const attendu = pack.members.reduce(
        (n, ref) => n + lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))!.enemy.count,
        0,
      )
      expect(pack.count).toBe(attendu)
    }
  })

  it('place le centre et l\'enveloppe de chaque pack dans l\'image', () => {
    for (const pack of lookup.packs.values()) {
      expect(Number.isFinite(pack.center.x)).toBe(true)
      expect(Number.isFinite(pack.center.y)).toBe(true)
      expect(pack.hull.length).toBeGreaterThan(0)
      // Marge large : l'enveloppe est dilatée de 26 px au-delà des positions réelles.
      expect(pack.center.x).toBeGreaterThan(-200)
      expect(pack.center.x).toBeLessThan(MAP_WIDTH + 200)
      expect(pack.center.y).toBeGreaterThan(-200)
      expect(pack.center.y).toBeLessThan(MAP_HEIGHT + 200)
    }
  })

  it('sort les clones isolés (`g` nul) des packs : chacun se pull seul', () => {
    const dansUnPack = new Set(
      [...lookup.packs.values()].flatMap((p) => p.members.map((m) => cloneKey(m.enemyIdx, m.cloneIdx))),
    )
    for (const ref of lookup.loners) {
      const key = cloneKey(ref.enemyIdx, ref.cloneIdx)
      expect(dansUnPack.has(key)).toBe(false)
      expect(lookup.cloneByKey.get(key)!.clone.g).toBeNull()
    }
  })

  it('range chaque clone soit dans un pack, soit chez les isolés', () => {
    const classés = new Set([
      ...[...lookup.packs.values()].flatMap((p) => p.members.map((m) => cloneKey(m.enemyIdx, m.cloneIdx))),
      ...lookup.loners.map((r) => cloneKey(r.enemyIdx, r.cloneIdx)),
    ])
    expect(classés.size).toBe(lookup.cloneByKey.size)
  })
})

describe('countForces', () => {
  const lookup = getLookup(SLUG)!

  it('additionne les forces des clones référencés', () => {
    const pack = [...lookup.packs.values()][0]
    expect(countForces(lookup, pack.members)).toBe(pack.count)
  })

  it('ignore les références qui ne correspondent à rien', () => {
    expect(countForces(lookup, [{ enemyIdx: 9999, cloneIdx: 9999 }])).toBe(0)
  })

  it('renvoie zéro sans référence', () => {
    expect(countForces(lookup, [])).toBe(0)
  })

  it('ne dépasse pas le total de forces du donjon en ramassant tout', () => {
    const tous = [...lookup.cloneByKey.keys()].map(parseCloneKey)
    expect(countForces(lookup, tous)).toBeGreaterThanOrEqual(lookup.dungeon.totalCount)
  })
})

describe('URLs d\'assets', () => {
  const base = import.meta.env.BASE_URL

  it('partent de BASE_URL, pour rester valides en sous-chemin GitHub Pages', () => {
    expect(iconUrl('spell_nature_invisibilty')).toBe(`${base}icons/spell_nature_invisibilty.jpg`)
    expect(portraitUrl(12345)).toBe(`${base}portraits/12345.webp`)
    expect(mapUrl(SLUG)).toBe(`${base}maps/${SLUG}.webp`)
  })
})
