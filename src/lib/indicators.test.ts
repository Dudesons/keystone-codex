import { describe, expect, it } from 'vitest'
import type { Enemy } from './types'
import { dungeonList, getDungeon, getLookup } from './data'
import { getIndicators, kickList } from './indicators'

/**
 * `getIndicators` mémorise ses résultats sous la clé `<slug>/<enemy.id>`, sans invalidation.
 * Chaque cas utilise donc un `id` qui lui est propre, sinon les tests se contaminent.
 */
const SLUG = 'donjon-de-test' // aucun fichier dans content/ : on n'exerce que la voie MDT

const NEUTRAL_RING = 'rgba(180,190,210,0.75)'
const BOSS_RING = '#e0b552'

const enemy = (over: Partial<Enemy> & { id: number }): Enemy => ({
  mdtIdx: 1,
  name: 'Mob de test',
  count: 1,
  health: 100_000,
  level: 80,
  scale: 1,
  cc: [],
  spells: [],
  clones: [],
  ...over,
})

describe('getIndicators — mob sans fiche rédigée', () => {
  it('marque « à couper » dès que MDT déclare un sort interruptible', () => {
    const i = getIndicators(SLUG, enemy({
      id: 900_001,
      spells: [{ id: 11 }, { id: 12, interruptible: true }],
    }))
    expect(i.kick).toBe(true)
    expect(i.kickSpells).toEqual([12])
  })

  it('ne marque rien quand aucun sort n\'est interruptible', () => {
    const i = getIndicators(SLUG, enemy({ id: 900_002, spells: [{ id: 21 }, { id: 22 }] }))
    expect(i.kick).toBe(false)
    expect(i.kickSpells).toEqual([])
  })

  it('collecte les types de dispel de MDT sans doublon', () => {
    const i = getIndicators(SLUG, enemy({
      id: 900_003,
      spells: [
        { id: 31, dispel: ['magic'] },
        { id: 32, dispel: ['magic', 'enrage'] },
      ],
    }))
    expect(i.dispel.sort()).toEqual(['enrage', 'magic'])
  })

  it('laisse la menace indéfinie et pose l\'anneau neutre — « pas encore jugé », pas « inoffensif »', () => {
    const i = getIndicators(SLUG, enemy({ id: 900_004 }))
    expect(i.threat).toBeUndefined()
    expect(i.ring).toBe(NEUTRAL_RING)
    expect(i.priority).toBe(false)
  })

  it('ne déduit ni tank buster ni piège : ils n\'ont aucune source dans MDT', () => {
    const i = getIndicators(SLUG, enemy({
      id: 900_005,
      spells: [{ id: 51, interruptible: true }],
    }))
    expect(i.tankBuster).toBe(false)
    expect(i.hasTrap).toBe(false)
  })

  it('traite un boss comme prioritaire et lui donne l\'anneau doré', () => {
    const i = getIndicators(SLUG, enemy({ id: 900_006, isBoss: true }))
    expect(i.priority).toBe(true)
    expect(i.ring).toBe(BOSS_RING)
    // Le boss reste sans menace tant que personne ne l'a jugé.
    expect(i.threat).toBeUndefined()
  })
})

describe('getIndicators — mémoïsation', () => {
  it('renvoie la même instance pour un mob déjà calculé', () => {
    const e = enemy({ id: 900_010, spells: [{ id: 101, interruptible: true }] })
    expect(getIndicators(SLUG, e)).toBe(getIndicators(SLUG, e))
  })

  it('sépare les donjons : la clé de cache porte le slug', () => {
    const e = enemy({ id: 900_011, spells: [{ id: 111, interruptible: true }] })
    expect(getIndicators(SLUG, e)).not.toBe(getIndicators('autre-donjon-de-test', e))
  })
})

describe('kickList', () => {
  it('ne retient que les sorts à couper', () => {
    const list = kickList(SLUG, enemy({
      id: 900_020,
      spells: [{ id: 201 }, { id: 202, interruptible: true }, { id: 203 }],
    }))
    expect(list.map((s) => s.id)).toEqual([202])
  })

  it('nomme les sorts absents de spells.json par leur identifiant', () => {
    const list = kickList(SLUG, enemy({
      id: 900_021,
      spells: [{ id: 999_001, interruptible: true }],
    }))
    expect(list[0].name).toBe('#999001')
  })

  it('trie par nom à défaut de priorité déclarée', () => {
    const list = kickList(SLUG, enemy({
      id: 900_022,
      spells: [
        { id: 999_030, interruptible: true },
        { id: 999_010, interruptible: true },
        { id: 999_020, interruptible: true },
      ],
    }))
    expect(list.map((s) => s.name)).toEqual(['#999010', '#999020', '#999030'])
    expect(list.every((s) => s.prio === undefined)).toBe(true)
  })
})

describe('getIndicators — mob avec fiche rédigée', () => {
  // Ritual Chieftain : la seule fiche du dépôt portant menace, piège et sorts annotés.
  const SLUG_REEL = 'altar-of-fangs'
  const HIGH_RING = '#d97036'
  const chieftain = getLookup(SLUG_REEL)!.enemyById.get(270_306)!
  const i = getIndicators(SLUG_REEL, chieftain)

  it('reprend la menace de la fiche et en déduit l\'anneau', () => {
    expect(chieftain).toBeDefined()
    expect(i.threat).toBe('high')
    expect(i.ring).toBe(HIGH_RING)
  })

  it('rend prioritaire un mob jugé « high », sans qu\'il soit boss', () => {
    expect(chieftain.isBoss).toBeUndefined()
    expect(i.priority).toBe(true)
  })

  it('lève le tank buster depuis `tag: tank`, que MDT ne sait pas fournir', () => {
    expect(i.tankBuster).toBe(true)
  })

  it('signale le piège rédigé', () => {
    expect(i.hasTrap).toBe(true)
  })

  it('ajoute aux sorts à couper ceux annotés `tag: kick`', () => {
    expect(i.kickSpells).toContain(1306517)
  })

  it('trie le briefing par priorité déclarée', () => {
    const list = kickList(SLUG_REEL, chieftain)
    expect(list.length).toBeGreaterThan(0)
    const prios = list.map((s) => s.prio ?? 99)
    for (let k = 1; k < prios.length; k++) expect(prios[k]).toBeGreaterThanOrEqual(prios[k - 1])
    expect(list[0].prio).toBe(1)
  })
})

describe('Données réelles du pool', () => {
  const enemies = dungeonList.flatMap((d) => getDungeon(d.slug)?.enemies ?? [])

  it('charge le pool de la saison', () => {
    expect(dungeonList.length).toBeGreaterThan(0)
    expect(enemies.length).toBeGreaterThan(0)
  })

  it('dérive les pastilles « à couper » de MDT, sans qu\'aucune fiche soit rédigée', () => {
    const interruptibles = enemies.filter((e) => e.spells.some((s) => s.interruptible))
    expect(interruptibles.length).toBeGreaterThan(0)

    for (const e of interruptibles) {
      const slug = dungeonList.find((d) => getDungeon(d.slug)?.enemies.includes(e))!.slug
      expect(getIndicators(slug, e).kick).toBe(true)
    }
  })

  it('dérive les types de dispel de MDT', () => {
    const dispellable = enemies.filter((e) => e.spells.some((s) => s.dispel?.length))
    expect(dispellable.length).toBeGreaterThan(0)
  })

  it('donne l\'anneau doré à tous les boss du pool', () => {
    const bosses = enemies.filter((e) => e.isBoss)
    expect(bosses.length).toBeGreaterThan(0)
    for (const boss of bosses) {
      const slug = dungeonList.find((d) => getDungeon(d.slug)?.enemies.includes(boss))!.slug
      expect(getIndicators(slug, boss).ring).toBe(BOSS_RING)
    }
  })
})
