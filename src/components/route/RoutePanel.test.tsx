// ABOUTME: Tests the route panel: forces, pull list, briefings, import, export and sharing.
// ABOUTME: Passes a recorder in place of the actions and asserts a click reaches the document.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLookup } from '../../lib/data'
import { emptyRoute, nextColor, routeToLua, type Route } from '../../lib/mdt/route'
import { encodeMdtString } from '../../lib/mdt/string'
import type { CollabState, RouteActions } from '../../lib/mdt/useRouteDoc'
import { renderEn } from '../../test/render'
import RoutePanel from './RoutePanel'

afterEach(cleanup)

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!
const MDT_INDEX = lookup.dungeon.mdtIndex
const packs = [...lookup.packs.values()]

/**
 * The panel is a controlled view: it owns no route state, it calls `actions`. Recording the
 * calls is the point — it is what proves a click reaches the document — and a recorder is
 * not a mock of behaviour under test, since the actions themselves are covered by
 * `useRouteDoc.test.tsx`.
 */
function recorder() {
  const calls: string[] = []
  const log = (name: string) => (...args: unknown[]) => {
    calls.push(`${name}(${args.map((a) => JSON.stringify(a)).join(', ')})`)
  }
  const actions = {
    setName: log('setName'),
    addPull: log('addPull'),
    removePull: log('removePull'),
    movePull: log('movePull'),
    setPullColor: log('setPullColor'),
    toggleClones: log('toggleClones'),
    importRoute: log('importRoute'),
    reset: log('reset'),
  } as unknown as RouteActions
  return { calls, actions }
}

const offline: CollabState = { status: 'off', room: null, peers: 0, identity: 'Player-1234' }

const routeWith = (packCount: number): Route => ({
  ...emptyRoute(SLUG, MDT_INDEX, 'Test route'),
  pulls: packs.slice(0, packCount).map((pack, i) => ({
    color: nextColor(i),
    clones: pack.members,
  })),
})

const mount = (over: Partial<React.ComponentProps<typeof RoutePanel>> = {}) => {
  const { calls, actions } = recorder()
  const result = renderEn(
    <RoutePanel
      slug={SLUG}
      lookup={lookup}
      route={routeWith(2)}
      actions={actions}
      currentPull={0}
      onCurrentPullChange={() => {}}
      hoveredPull={null}
      onHoverPull={() => {}}
      onFocusMob={() => {}}
      collab={offline}
      onJoinRoom={() => {}}
      onLeaveRoom={() => {}}
      {...over}
    />,
  )
  return { ...result, calls }
}

describe('Route summary', () => {
  it('shows the name in an editable field', () => {
    mount()
    expect(screen.getByDisplayValue('Test route')).toBeDefined()
  })

  it('reports the edited name through the actions', () => {
    const { calls } = mount()
    fireEvent.change(screen.getByDisplayValue('Test route'), { target: { value: 'Week 5' } })
    expect(calls).toContain('setName("Week 5")')
  })

  it('shows accumulated forces against the required total', () => {
    const { container } = mount()
    const total = packs.slice(0, 2).reduce((n, p) => n + p.count, 0)
    expect(container.textContent).toContain(String(total))
    expect(container.textContent).toContain(String(lookup.dungeon.totalCount))
  })

  it('caps the progress bar at 100% even when the route over-pulls', () => {
    const everything: Route = {
      ...emptyRoute(SLUG, MDT_INDEX),
      pulls: [{ color: nextColor(0), clones: [...lookup.cloneByKey.keys()].map((k) => {
        const [enemyIdx, cloneIdx] = k.split(':').map(Number)
        return { enemyIdx, cloneIdx }
      }) }],
    }
    const { container } = mount({ route: everything })
    const bar = container.querySelector<HTMLElement>('.bg-threat-low')!
    expect(bar.style.width).toBe('100%')
  })
})

describe('Pull list', () => {
  it('counts the pulls in its heading', () => {
    mount()
    expect(screen.getByText('PULLS · 2')).toBeDefined()
  })

  it('lists each pull with its mobs and unit counts', () => {
    const { container } = mount()
    const items = container.querySelectorAll('ol > li')
    expect(items).toHaveLength(2)
    expect(items[0].textContent).toMatch(/\d+× /)
  })

  it('says a pull is empty rather than showing a blank line', () => {
    const { container } = mount({ route: emptyRoute(SLUG, MDT_INDEX) })
    expect(container.textContent).toContain('empty — click a pack on the map')
  })

  it('marks the current pull', () => {
    const { container } = mount({ currentPull: 1 })
    const items = container.querySelectorAll('ol > li')
    expect(items[1].className).toContain('border-gold-500')
    expect(items[0].className).not.toContain('border-gold-500')
  })

  it('selects a pull when it is clicked', () => {
    const picked: number[] = []
    const { container } = mount({ onCurrentPullChange: (i: number) => picked.push(i) })
    fireEvent.click(container.querySelectorAll('ol > li')[1])
    expect(picked).toEqual([1])
  })

  it('reports hover, so the map can highlight the pull', () => {
    const hovered: (number | null)[] = []
    const { container } = mount({ onHoverPull: (i: number | null) => hovered.push(i) })
    const item = container.querySelectorAll('ol > li')[0]
    fireEvent.mouseEnter(item)
    fireEvent.mouseLeave(item)
    expect(hovered).toEqual([0, null])
  })
})

describe('Pull actions', () => {
  it('adds a pull', () => {
    const { calls } = mount()
    fireEvent.click(screen.getByText('+ Pull'))
    expect(calls).toContain('addPull()')
  })

  it('moves a pull up and down', () => {
    const { calls } = mount()
    fireEvent.click(screen.getAllByTitle('Move up')[1])
    fireEvent.click(screen.getAllByTitle('Move down')[0])
    expect(calls).toContain('movePull(1, -1)')
    expect(calls).toContain('movePull(0, 1)')
  })

  it('deletes a pull', () => {
    const { calls } = mount()
    fireEvent.click(screen.getAllByText('Delete')[0])
    expect(calls).toContain('removePull(0)')
  })

  it('does not select the pull when acting on its buttons', () => {
    // The buttons sit inside the clickable row; without stopPropagation every delete would
    // also change the current pull.
    const picked: number[] = []
    mount({ onCurrentPullChange: (i: number) => picked.push(i) })
    fireEvent.click(screen.getAllByTitle('Move up')[1])
    expect(picked).toEqual([0]) // only the move's own correction, not the row click
  })
})

describe('Pull briefing', () => {
  it('stays closed until asked', () => {
    const { container } = mount()
    expect(container.textContent).toContain('▸ Briefing')
    expect(container.textContent).not.toContain('▾ Hide')
  })

  it('opens on one pull at a time', () => {
    const { container } = mount()
    fireEvent.click(screen.getAllByText('▸ Briefing')[0])
    expect(container.textContent).toContain('▾ Hide')
    expect(screen.getAllByText('▸ Briefing')).toHaveLength(1)
  })

  it('closes again', () => {
    const { container } = mount()
    fireEvent.click(screen.getAllByText('▸ Briefing')[0])
    fireEvent.click(screen.getByText('▾ Hide'))
    expect(container.textContent).not.toContain('▾ Hide')
  })

  it('focuses the mob when a briefing line is clicked', () => {
    const focused: number[] = []
    const { container } = mount({ onFocusMob: (id: number) => focused.push(id) })
    fireEvent.click(screen.getAllByText('▸ Briefing')[0])
    const line = container.querySelector('ol > li > div:nth-of-type(2) > div')!
    fireEvent.click(line)
    expect(focused).toHaveLength(1)
    expect(typeof focused[0]).toBe('number')
  })
})

describe('Import', () => {
  const mdt = (route: Route) => encodeMdtString(routeToLua(route))

  it('disables the button while the field is empty', () => {
    mount()
    expect(screen.getByText('Import').closest('button')!.disabled).toBe(true)
  })

  it('passes the pasted string to the actions', () => {
    const { calls } = mount()
    const text = mdt(routeWith(1))
    fireEvent.change(screen.getByPlaceholderText(/Paste an MDT string/), { target: { value: text } })
    fireEvent.click(screen.getByText('Import'))
    expect(calls.some((c) => c.startsWith('importRoute('))).toBe(true)
  })

  it('translates a codec error into a sentence instead of leaking it raw', () => {
    const { actions } = recorder()
    renderEn(
      <RoutePanel
        slug={SLUG}
        lookup={lookup}
        route={routeWith(1)}
        actions={{
          ...actions,
          importRoute: () => {
            throw new (class extends Error {})('boom')
          },
        }}
        currentPull={0}
        onCurrentPullChange={() => {}}
        hoveredPull={null}
        onHoverPull={() => {}}
        onFocusMob={() => {}}
        collab={offline}
        onJoinRoom={() => {}}
        onLeaveRoom={() => {}}
      />,
    )
    fireEvent.change(screen.getByPlaceholderText(/Paste an MDT string/), { target: { value: 'x' } })
    fireEvent.click(screen.getByText('Import'))
    expect(screen.getByText('boom')).toBeDefined()
  })

  it('clears the route', () => {
    const { calls } = mount()
    fireEvent.click(screen.getByText('Clear'))
    expect(calls).toContain('reset()')
  })
})

describe('Export', () => {
  it('copies a re-importable MDT string to the clipboard', async () => {
    const written: string[] = []
    vi.stubGlobal('navigator', {
      clipboard: { writeText: async (s: string) => void written.push(s) },
    })

    mount()
    fireEvent.click(screen.getByText('Copy MDT string'))
    await screen.findByText(/MDT string copied/)

    expect(written).toHaveLength(1)
    expect(written[0].startsWith('!~MDT2~')).toBe(true)
    vi.unstubAllGlobals()
  })
})

describe('Collaborative session', () => {
  it('offers to open or join one while offline', () => {
    mount()
    expect(screen.getByText('EDIT TOGETHER')).toBeDefined()
    expect(screen.getByText('Open a session with this route')).toBeDefined()
  })

  it('opens a session with a six-character code, as host', () => {
    const joined: [string, string][] = []
    mount({ onJoinRoom: (room: string, mode: string) => joined.push([room, mode]) })
    fireEvent.click(screen.getByText('Open a session with this route'))
    expect(joined).toHaveLength(1)
    expect(joined[0][0]).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    expect(joined[0][1]).toBe('host')
  })

  it('refuses to join on a code too short to be real', () => {
    mount()
    const join = screen.getByText('Join').closest('button')!
    expect(join.disabled).toBe(true)

    fireEvent.change(screen.getByPlaceholderText('CODE'), { target: { value: 'abc' } })
    expect(join.disabled).toBe(true)
  })

  it('uppercases the typed code and joins as guest', () => {
    const joined: [string, string][] = []
    mount({ onJoinRoom: (room: string, mode: string) => joined.push([room, mode]) })
    fireEvent.change(screen.getByPlaceholderText('CODE'), { target: { value: 'ab3k9z' } })
    expect(screen.getByDisplayValue('AB3K9Z')).toBeDefined()

    fireEvent.click(screen.getByText('Join'))
    expect(joined).toEqual([['AB3K9Z', 'guest']])
  })

  it('shows the room, the peer count and the identity once connected', () => {
    const connected: CollabState = {
      status: 'connected',
      room: 'AB3K9Z',
      peers: 3,
      identity: 'Player-1234',
    }
    const { container } = mount({ collab: connected })
    const section = within(container.querySelector('.border-threat-low\\/40') as HTMLElement)
    expect(section.getByText('SHARED SESSION')).toBeDefined()
    expect(section.getByText('AB3K9Z')).toBeDefined()
    expect(section.getByText('3 connected')).toBeDefined()
    expect(section.getByText('Player-1234')).toBeDefined()
  })

  it('says it is connecting before the peers answer', () => {
    const { container } = mount({
      collab: { status: 'connecting', room: 'AB3K9Z', peers: 0, identity: 'Player-1234' },
    })
    expect(container.textContent).toContain('connecting…')
  })

  it('leaves the session', () => {
    let left = false
    mount({
      collab: { status: 'connected', room: 'AB3K9Z', peers: 2, identity: 'Player-1234' },
      onLeaveRoom: () => {
        left = true
      },
    })
    fireEvent.click(screen.getByText('Leave'))
    expect(left).toBe(true)
  })
})
