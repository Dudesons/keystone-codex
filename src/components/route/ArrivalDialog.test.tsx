// ABOUTME: Tests the dialog a shared link is answered in: the route offer and the room invitation.
// ABOUTME: Asserts what reaches the callbacks, and that nothing is offered twice or after joining.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CollabState } from '../../lib/mdt/useRouteDoc'
import { renderEn, renderFr } from '../../test/render'
import ArrivalDialog from './ArrivalDialog'

afterEach(cleanup)

const offline: CollabState = {
  status: 'off',
  room: null,
  peers: [],
  identity: 'Player-1234',
  synced: false,
  mode: null,
}

const connected: CollabState = {
  status: 'connected',
  room: 'ABC123',
  peers: [],
  identity: 'Player-1234',
  synced: true,
  mode: 'guest',
}

const mount = (
  over: Partial<React.ComponentProps<typeof ArrivalDialog>> = {},
  render: typeof renderEn = renderEn,
) =>
  render(
    <ArrivalDialog
      collab={offline}
      pendingRoom={null}
      pendingRoute={null}
      onJoinRoom={() => {}}
      onDeclineRoom={() => {}}
      onSetIdentity={() => {}}
      onAcceptRoute={() => {}}
      onDeclineRoute={() => {}}
      {...over}
    />,
  )

describe('When a link offers nothing', () => {
  it('renders no dialog at all', () => {
    const { container } = mount()
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})

describe('A route carried by a link', () => {
  it('is offered in a modal dialog, not somewhere down the panel', () => {
    mount({ pendingRoute: 'PAYLOAD' })
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.textContent).toContain('This link carries a route')
  })

  it('is named by its heading, so the dialog has an accessible name', () => {
    mount({ pendingRoute: 'PAYLOAD' })
    // `getByRole('dialog', { name })` resolves aria-labelledby — a heading that is not wired to
    // the dialog would render fine and fail here.
    expect(screen.getByRole('dialog', { name: 'A shared route' })).toBeDefined()
  })

  it('loads nothing until the offer is taken', () => {
    const onAcceptRoute = vi.fn()
    mount({ pendingRoute: 'PAYLOAD', onAcceptRoute })
    expect(onAcceptRoute).not.toHaveBeenCalled()
  })

  it('hands the decision back when the offer is taken', () => {
    const onAcceptRoute = vi.fn()
    mount({ pendingRoute: 'PAYLOAD', onAcceptRoute })
    fireEvent.click(screen.getByRole('button', { name: 'Load this route' }))
    expect(onAcceptRoute).toHaveBeenCalledOnce()
  })

  it('declines without loading', () => {
    const onAcceptRoute = vi.fn()
    const onDeclineRoute = vi.fn()
    mount({ pendingRoute: 'PAYLOAD', onAcceptRoute, onDeclineRoute })
    fireEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    expect(onDeclineRoute).toHaveBeenCalledOnce()
    expect(onAcceptRoute).not.toHaveBeenCalled()
  })

  it('is still offered during a session, since a route is not a room', () => {
    mount({ pendingRoute: 'PAYLOAD', collab: connected })
    expect(screen.getByRole('dialog')).toBeDefined()
  })
})

describe('An invitation carried by a link', () => {
  it('names the room and warns that the local route is set aside', () => {
    mount({ pendingRoom: 'ABC123' })
    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('ABC123')
    expect(dialog.textContent).toMatch(/set aside/i)
  })

  it('carries the name field, so joining needs no hunt through the panel', () => {
    const onSetIdentity = vi.fn()
    mount({ pendingRoom: 'ABC123', collab: { ...offline, identity: null }, onSetIdentity })
    const field = screen.getByLabelText('Your name')
    fireEvent.change(field, { target: { value: 'Rwl' } })
    expect(onSetIdentity).toHaveBeenCalledWith('Rwl')
  })

  it('refuses to join until a name is given, same as the panel’s other entry points', () => {
    mount({ pendingRoom: 'ABC123', collab: { ...offline, identity: null } })
    const join = screen.getByRole('button', { name: /join room abc123/i }) as HTMLButtonElement
    expect(join.disabled).toBe(true)
  })

  it('joins as a guest once accepted', () => {
    const onJoinRoom = vi.fn()
    mount({ pendingRoom: 'ABC123', onJoinRoom })
    fireEvent.click(screen.getByRole('button', { name: /join room abc123/i }))
    expect(onJoinRoom).toHaveBeenCalledWith('ABC123', 'guest')
  })

  it('can be turned down, which is new: the panel card had no way to say no', () => {
    const onDeclineRoom = vi.fn()
    const onJoinRoom = vi.fn()
    mount({ pendingRoom: 'ABC123', onDeclineRoom, onJoinRoom })
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(onDeclineRoom).toHaveBeenCalledOnce()
    expect(onJoinRoom).not.toHaveBeenCalled()
  })

  it('stops being offered once the session is open', () => {
    // `?room=` stays in the address after joining, so a reload offers the invitation again. A
    // dialog keyed on the parameter alone would sit over the session it had already joined.
    const { container } = mount({ pendingRoom: 'ABC123', collab: connected })
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })

  it('outranks a route on a link carrying both', () => {
    // Joining replaces the document from the peer, so applying a route first is work thrown
    // away. The page already nulls one of them; the precedence lives here too so the component
    // is answerable on its own terms.
    mount({ pendingRoom: 'ABC123', pendingRoute: 'PAYLOAD' })
    expect(screen.getByRole('dialog').textContent).not.toContain('This link carries a route')
    expect(screen.getByRole('dialog').textContent).toContain('ABC123')
  })
})

describe('Dismissing the dialog', () => {
  it('turns the route offer down on Escape', () => {
    const onDeclineRoute = vi.fn()
    mount({ pendingRoute: 'PAYLOAD', onDeclineRoute })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onDeclineRoute).toHaveBeenCalledOnce()
  })

  it('turns the invitation down on Escape', () => {
    const onDeclineRoom = vi.fn()
    mount({ pendingRoom: 'ABC123', onDeclineRoom })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onDeclineRoom).toHaveBeenCalledOnce()
  })

  it('leaves the offer standing on any other key', () => {
    const onDeclineRoute = vi.fn()
    mount({ pendingRoute: 'PAYLOAD', onDeclineRoute })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })
    expect(onDeclineRoute).not.toHaveBeenCalled()
  })

  it('turns it down on a click outside', () => {
    const onDeclineRoute = vi.fn()
    const { container } = mount({ pendingRoute: 'PAYLOAD', onDeclineRoute })
    fireEvent.click(container.querySelector('[data-arrival-backdrop]')!)
    expect(onDeclineRoute).toHaveBeenCalledOnce()
  })
})

describe('Where the keyboard lands', () => {
  it('focuses the route offer’s own button, so Escape and Enter need no click first', () => {
    mount({ pendingRoute: 'PAYLOAD' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Load this route' }))
  })

  it('focuses the name field when the invitation needs one, since that is the first step', () => {
    mount({ pendingRoom: 'ABC123', collab: { ...offline, identity: null } })
    expect(document.activeElement).toBe(screen.getByLabelText('Your name'))
  })

  it('focuses the join button when a name is already known', () => {
    mount({ pendingRoom: 'ABC123' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /join room abc123/i }))
  })
})

describe('In French', () => {
  it('offers the route in French, so nothing here is hardcoded English', () => {
    mount({ pendingRoute: 'PAYLOAD' }, renderFr)
    expect(screen.getByRole('dialog', { name: 'Une route partagée' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Charger cette route' })).toBeDefined()
  })

  it('turns the invitation down in French', () => {
    const onDeclineRoom = vi.fn()
    mount({ pendingRoom: 'ABC123', onDeclineRoom }, renderFr)
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }))
    expect(onDeclineRoom).toHaveBeenCalledOnce()
  })
})
