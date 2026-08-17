// ABOUTME: Tests the route panel: forces, pull list, briefings, import, export and sharing.
// ABOUTME: Passes a recorder in place of the actions and asserts a click reaches the document.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLookup } from '../../lib/data'
import { emptyRoute, nextColor, routeToLua, type Route } from '../../lib/mdt/route'
import { encodeMdtString } from '../../lib/mdt/string'
import type { Peer } from '../../lib/collab/presence'
import type { CollabState, RouteActions } from '../../lib/mdt/useRouteDoc'
import { renderEn } from '../../test/render'
import RoutePanel, { sessionLink } from './RoutePanel'

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

/** Stand-ins for connected participants: only the count is under test here, not who they are. */
const peersOf = (n: number): Peer[] =>
  Array.from({ length: n }, (_, i) => ({
    clientId: i,
    name: `Peer-${i}`,
    color: '#000',
    isSelf: i === 0,
  }))

const offline: CollabState = {
  status: 'off',
  room: null,
  peers: [],
  identity: 'Player-1234',
  synced: false,
  mode: null,
}

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
      onSetIdentity={() => {}}
      pendingRoom={null}
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
        onSetIdentity={() => {}}
        pendingRoom={null}
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
    // `status` and `synced` are independent — a connected socket that hasn't synced is the
    // very state this task's `synced` field exists to name. This fixture just isn't that case:
    // it stands for the ordinary run of a session that reached the room and heard back.
    const connected: CollabState = {
      status: 'connected',
      room: 'AB3K9Z',
      peers: peersOf(3),
      identity: 'Player-1234',
      synced: true,
      mode: 'guest',
    }
    const { container } = mount({ collab: connected })
    const section = within(container.querySelector('.border-threat-low\\/40') as HTMLElement)
    expect(section.getByText('SHARED SESSION')).toBeDefined()
    expect(section.getByText('AB3K9Z')).toBeDefined()
    expect(section.getByText('3 connected')).toBeDefined()
    expect((section.getByLabelText(/your name/i) as HTMLInputElement).value).toBe('Player-1234')
  })

  it('says it is connecting before the peers answer', () => {
    const { container } = mount({
      collab: {
        status: 'connecting',
        room: 'AB3K9Z',
        peers: [],
        identity: 'Player-1234',
        synced: false,
        mode: 'guest',
      },
    })
    expect(container.textContent).toContain('connecting…')
  })

  it('leaves the session', () => {
    let left = false
    mount({
      collab: {
        status: 'connected',
        room: 'AB3K9Z',
        peers: peersOf(2),
        identity: 'Player-1234',
        synced: true,
        mode: 'guest',
      },
      onLeaveRoom: () => {
        left = true
      },
    })
    fireEvent.click(screen.getByText('Leave'))
    expect(left).toBe(true)
  })
})

describe('Awaiting the room’s route', () => {
  // A guest whose document has joined the room but not yet received anything: an empty route
  // (nothing has arrived) mounted with `synced: false` (the provider hasn't caught up). That
  // pairing is exactly the ambiguity this task removes — but only for a guest. A host's
  // document already is the room's, so the same pairing on a host must never read as the same
  // ambiguity, however empty its route happens to be.
  const connected = (mode: 'host' | 'guest', synced: boolean): CollabState => ({
    status: 'connected',
    room: 'AB3K9Z',
    peers: peersOf(2),
    identity: 'Player-1234',
    synced,
    mode,
  })

  it('tells a guest the room’s route is on its way rather than showing an empty one', () => {
    mount({ route: emptyRoute(SLUG, MDT_INDEX), collab: connected('guest', false) })
    expect(screen.getByText(/fetching the room/i)).toBeDefined()
  })

  it('shows the route once it has arrived', () => {
    mount({ route: routeWith(2), collab: connected('guest', true) })
    expect(screen.queryByText(/fetching the room/i)).toBeNull()
  })

  it('does not tell a host holding its own empty route that one is coming', () => {
    // The real distinction is `mode`, not how many clones the route happens to hold: a host
    // with nothing pulled yet — a normal way to start a session — must not be told a route is
    // on its way, because there is nothing to fetch. Its document is the room.
    mount({ route: emptyRoute(SLUG, MDT_INDEX), collab: connected('host', false) })
    expect(screen.queryByText(/fetching the room/i)).toBeNull()
  })

  it('goes quiet when a guest loses the relay over a route it already holds', () => {
    // `y-websocket` resets `synced` when the socket drops, so a mid-session outage would
    // otherwise announce a fetch above the route already on screen. What is coming then is a
    // reconnection, and the notice on the map is what says so.
    mount({ route: routeWith(2), collab: connected('guest', false) })
    expect(screen.queryByText(/fetching the room/i)).toBeNull()
  })
})

describe('Choosing a name', () => {
  it('refuses to open or join a session until a name is given', () => {
    mount({ collab: { ...offline, identity: null } })
    fireEvent.change(screen.getByPlaceholderText('CODE'), { target: { value: 'AB3K9Z' } })
    expect(screen.getByRole('button', { name: /open a session/i }).closest('button')!.disabled).toBe(true)
    expect(screen.getByRole('button', { name: /^join$/i }).closest('button')!.disabled).toBe(true)
  })

  it('offers the name already remembered', () => {
    mount({ collab: { ...offline, identity: 'Rwl' } })
    expect((screen.getByLabelText(/your name/i) as HTMLInputElement).value).toBe('Rwl')
  })

  it('reports a name as it is typed', () => {
    const onSetIdentity = vi.fn()
    mount({ collab: { ...offline, identity: null }, onSetIdentity })
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'R' } })
    expect(onSetIdentity).toHaveBeenCalledWith('R')
  })

  it('still offers the name while a session is open, so it can be changed', () => {
    const connected: CollabState = {
      status: 'connected',
      room: 'AB3K9Z',
      peers: peersOf(1),
      identity: 'Rwl',
      synced: true,
      mode: 'host',
    }
    mount({ collab: connected })
    expect((screen.getByLabelText(/your name/i) as HTMLInputElement).value).toBe('Rwl')
  })

  it('keeps the space while a multi-word name is typed one character at a time', () => {
    // `setIdentity` (`useRouteDoc.ts`) trims on every call and the trimmed value comes
    // straight back down as `collab.identity` — this mirrors that round trip, the same way a
    // real session does through `useRouteDoc`, rather than a recorder that never echoes back.
    let identity: string | null = null
    const onSetIdentity = (name: string) => {
      identity = name.trim()
      rerender(renderPanel())
    }
    const renderPanel = () => (
      <RoutePanel
        slug={SLUG}
        lookup={lookup}
        route={routeWith(2)}
        actions={recorder().actions}
        currentPull={0}
        onCurrentPullChange={() => {}}
        hoveredPull={null}
        onHoverPull={() => {}}
        onFocusMob={() => {}}
        collab={{ ...offline, identity }}
        onJoinRoom={() => {}}
        onLeaveRoom={() => {}}
        onSetIdentity={onSetIdentity}
        pendingRoom={null}
      />
    )
    const { rerender } = renderEn(renderPanel())

    // Each keystroke appends to the field's own current value, exactly as a real keypress
    // would land after whatever the previous render left on screen — reusing a string tracked
    // separately in the test would silently paper over the bug this pins.
    const input = screen.getByLabelText(/your name/i) as HTMLInputElement
    for (const ch of 'AB CD') {
      fireEvent.change(input, { target: { value: input.value + ch } })
    }

    expect((screen.getByLabelText(/your name/i) as HTMLInputElement).value).toBe('AB CD')
  })
})

describe('sessionLink', () => {
  it('puts the room inside the hash, where a static host can still route it', () => {
    expect(sessionLink('altar-of-fangs', 'ABC123')).toBe(
      `${location.origin}${location.pathname}#/d/altar-of-fangs?room=ABC123`,
    )
  })
})

describe('An invitation carried by a link', () => {
  it('names the room and warns that the local route is set aside', () => {
    const { container } = mount({ pendingRoom: 'ABC123' })
    expect(container.textContent).toContain('ABC123')
    expect(container.textContent).toMatch(/set aside/i)
  })

  it('joins nothing until the invitation is accepted', () => {
    const onJoinRoom = vi.fn()
    mount({ pendingRoom: 'ABC123', onJoinRoom })
    expect(onJoinRoom).not.toHaveBeenCalled()
  })

  it('joins as a guest once accepted', () => {
    const onJoinRoom = vi.fn()
    mount({ collab: { ...offline, identity: 'Rwl' }, pendingRoom: 'ABC123', onJoinRoom })
    fireEvent.click(screen.getByRole('button', { name: /join room abc123/i }))
    expect(onJoinRoom).toHaveBeenCalledWith('ABC123', 'guest')
  })

  it('refuses to join until a name is given, same as the other two entry points', () => {
    mount({ pendingRoom: 'ABC123', collab: { ...offline, identity: null } })
    expect(screen.getByRole('button', { name: /join room abc123/i }).closest('button')!.disabled).toBe(true)
  })

  it('offers a link to copy while a session is open', () => {
    const connected: CollabState = {
      status: 'connected',
      room: 'ABC123',
      peers: peersOf(1),
      identity: 'Player-1234',
      synced: true,
      mode: 'guest',
    }
    mount({ collab: connected })
    expect(screen.getByRole('button', { name: /copy the link/i })).toBeDefined()
  })

  it('reports a refused clipboard write instead of leaving it an unhandled rejection', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: async () => {
          throw new Error('denied')
        },
      },
    })
    try {
      const connected: CollabState = {
        status: 'connected',
        room: 'ABC123',
        peers: peersOf(1),
        identity: 'Player-1234',
        synced: true,
        mode: 'guest',
      }

      mount({ collab: connected })
      fireEvent.click(screen.getByRole('button', { name: /copy the link/i }))
      await screen.findByText('denied')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
