// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { cloneKey, getLookup } from '../data'
import { decodeMdtString, encodeMdtString } from './string'
import { emptyRoute, luaToRoute, nextColor, routeToLua, type Route } from './route'
import { randomRoomCode, useRouteDoc } from './useRouteDoc'

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!
const MDT_INDEX = lookup.dungeon.mdtIndex
const storageKey = `midnight-codex:route:${SLUG}`

const packs = [...lookup.packs.values()]
const packA = packs[0].members
const packB = packs[1].members

const monter = () => renderHook(() => useRouteDoc(SLUG, MDT_INDEX))

/** Une string MDT authentique, produite par le codec du dépôt à partir d'une vraie route. */
function stringMdt(pulls: Route['pulls'], name = 'Route importée'): string {
  return encodeMdtString(routeToLua({ ...emptyRoute(SLUG, MDT_INDEX, name), pulls }))
}

beforeEach(() => {
  localStorage.clear()
})

describe('État initial', () => {
  it('démarre sur une route neuve à un seul pull vide', () => {
    const { result } = monter()
    expect(result.current.route.name).toBe('New route')
    expect(result.current.route.slug).toBe(SLUG)
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toEqual([])
  })

  it('n\'ouvre aucune session collaborative tant qu\'on ne le demande pas', () => {
    const { result } = monter()
    expect(result.current.collab.status).toBe('off')
    expect(result.current.collab.room).toBeNull()
    expect(result.current.collab.identity).toMatch(/^Joueur-\d{4}$/)
  })
})

describe('Édition des pulls', () => {
  it('ajoute un pull et lui donne la couleur suivante de la palette', () => {
    const { result } = monter()
    act(() => result.current.actions.addPull())
    expect(result.current.route.pulls).toHaveLength(2)
    expect(result.current.route.pulls[1].color).toBe(nextColor(1))
  })

  it('renomme la route', () => {
    const { result } = monter()
    act(() => result.current.actions.setName('Semaine 12'))
    expect(result.current.route.name).toBe('Semaine 12')
  })

  it('change la couleur d\'un pull', () => {
    const { result } = monter()
    act(() => result.current.actions.setPullColor(0, 'abcdef'))
    expect(result.current.route.pulls[0].color).toBe('abcdef')
  })

  it('supprime un pull', () => {
    const { result } = monter()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.removePull(1))
    expect(result.current.route.pulls).toHaveLength(2)
  })

  it('garde toujours au moins un pull : une route sans pull n\'a pas de sens', () => {
    const { result } = monter()
    act(() => result.current.actions.removePull(0))
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toEqual([])
  })

  it('ignore la suppression d\'un index hors bornes', () => {
    const { result } = monter()
    act(() => result.current.actions.removePull(42))
    expect(result.current.route.pulls).toHaveLength(1)
  })

  it('déplace un pull en conservant ses clones et sa couleur', () => {
    const { result } = monter()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.actions.setPullColor(0, 'abcdef'))

    act(() => result.current.actions.movePull(0, 1))

    const [premier, second] = result.current.route.pulls
    expect(premier.clones).toEqual([])
    expect(second.color).toBe('abcdef')
    expect(second.clones).toHaveLength(packA.length)
  })

  it('ignore un déplacement qui sortirait de la liste', () => {
    const { result } = monter()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.movePull(0, -1))
    act(() => result.current.actions.movePull(1, 1))
    expect(result.current.route.pulls).toHaveLength(2)
  })
})

describe('Affectation des clones', () => {
  it('ajoute un pack au pull visé', () => {
    const { result } = monter()
    act(() => result.current.actions.toggleClones(0, packA))
    expect(result.current.route.pulls[0].clones).toHaveLength(packA.length)
  })

  it('retire le pack si tous ses clones y sont déjà — le clic est une bascule', () => {
    const { result } = monter()
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.actions.toggleClones(0, packA))
    expect(result.current.route.pulls[0].clones).toEqual([])
  })

  it('déplace un clone d\'un pull à l\'autre : il n\'appartient jamais à deux pulls', () => {
    const { result } = monter()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.actions.toggleClones(1, packA))

    expect(result.current.route.pulls[0].clones).toEqual([])
    expect(result.current.route.pulls[1].clones).toHaveLength(packA.length)
  })

  it('laisse les autres packs en place', () => {
    const { result } = monter()
    act(() => result.current.actions.addPull())
    act(() => result.current.actions.toggleClones(0, packA))
    act(() => result.current.actions.toggleClones(1, packB))
    act(() => result.current.actions.toggleClones(1, packB))

    expect(result.current.route.pulls[0].clones).toHaveLength(packA.length)
    expect(result.current.route.pulls[1].clones).toEqual([])
  })

  it('préserve les index MDT des clones', () => {
    const { result } = monter()
    act(() => result.current.actions.toggleClones(0, packA))
    const obtenus = result.current.route.pulls[0].clones.map((c) => cloneKey(c.enemyIdx, c.cloneIdx))
    expect(obtenus.sort()).toEqual(packA.map((c) => cloneKey(c.enemyIdx, c.cloneIdx)).sort())
  })
})

describe('Import et remise à zéro', () => {
  it('importe une string MDT et remplace la route courante', () => {
    const { result } = monter()
    act(() => result.current.actions.addPull())

    const mdt = stringMdt([{ color: nextColor(0), clones: packA }], 'Route du jeudi')
    act(() => {
      result.current.actions.importRoute(mdt)
    })

    expect(result.current.route.name).toBe('Route du jeudi')
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toHaveLength(packA.length)
  })

  it('conserve le preset d\'origine, pour ne rien perdre au ré-export', () => {
    const { result } = monter()
    act(() => {
      result.current.actions.importRoute(stringMdt([{ color: nextColor(0), clones: packA }]))
    })
    expect(result.current.route.source).toBeDefined()
  })

  it('rejette une string qui n\'est pas du MDT sans casser la route', () => {
    const { result } = monter()
    expect(() => result.current.actions.importRoute('pas une string MDT')).toThrow()
    expect(result.current.route.pulls).toHaveLength(1)
  })

  it('remet la route à neuf et oublie le preset importé', () => {
    const { result } = monter()
    act(() => {
      result.current.actions.importRoute(stringMdt([{ color: nextColor(0), clones: packA }], 'X'))
    })
    act(() => result.current.actions.reset())

    expect(result.current.route.name).toBe('New route')
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toEqual([])
    expect(result.current.route.source).toBeUndefined()
  })
})

describe('Sauvegarde locale', () => {
  it('écrit la route en string MDT réimportable', () => {
    const { result } = monter()
    act(() => result.current.actions.toggleClones(0, packA))

    const saved = localStorage.getItem(storageKey)
    expect(saved).toBeTruthy()
    expect(saved!.startsWith('!~MDT2~')).toBe(true)

    const relue = luaToRoute(decodeMdtString(saved!).table)
    expect(relue.slug).toBe(SLUG)
    expect(relue.pulls[0].clones).toHaveLength(packA.length)
  })

  it('restaure la route sauvegardée au montage suivant', () => {
    const { result, unmount } = monter()
    act(() => result.current.actions.setName('Route de la semaine'))
    act(() => result.current.actions.toggleClones(0, packA))
    unmount()

    const { result: repris } = monter()
    expect(repris.current.route.name).toBe('Route de la semaine')
    expect(repris.current.route.pulls[0].clones).toHaveLength(packA.length)
  })

  it('repart de zéro et purge le stockage si la sauvegarde est illisible', () => {
    localStorage.setItem(storageKey, 'contenu corrompu')
    const { result } = monter()
    expect(result.current.route.pulls).toHaveLength(1)
    expect(result.current.route.pulls[0].clones).toEqual([])
    expect(localStorage.getItem(storageKey)).not.toBe('contenu corrompu')
  })
})

describe('randomRoomCode', () => {
  it('produit six caractères', () => {
    expect(randomRoomCode()).toHaveLength(6)
  })

  it('évite les caractères ambigus à dicter (I, O, 0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      expect(randomRoomCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    }
  })
})
