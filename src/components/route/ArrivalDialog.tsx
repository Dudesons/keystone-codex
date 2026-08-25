// ABOUTME: The dialog that answers a shared link: load the route it carries, or join the room.
// ABOUTME: Centred over the map, because the side panel is a column an arriving reader never scrolls.

import { useEffect, useId, useRef } from 'react'
import type { CollabState } from '../../lib/mdt/useRouteDoc'
import { useI18n } from '../../lib/i18n/context'
import NameField from './NameField'

interface Props {
  collab: CollabState
  /** The room a join link carries. Null when the address carries none. */
  pendingRoom: string | null
  /** The route a share link carries. Null when the address carries none. */
  pendingRoute?: string | null
  onJoinRoom: (room: string, mode: 'host' | 'guest') => void
  onDeclineRoom?: () => void
  onSetIdentity: (name: string) => void
  /** Accepting is the page's business: importing reports through the panel's own message line. */
  onAcceptRoute: () => void
  onDeclineRoute?: () => void
}

/**
 * What a shared link asks, asked where it will be read.
 *
 * Both offers used to sit in the route panel — a 400px scrolling column on the right. The route
 * offer was at least at the top of it; the invitation was below the pull list, so it moved
 * further out of sight the longer the route being shared. Somebody opening a link has no reason
 * to look there at all, so both are now a decision taken in front of the map.
 *
 * Nothing is applied without being asked for: a link that silently replaced the route you were
 * drawing would be worse than one that is easy to miss.
 */
export default function ArrivalDialog({
  collab,
  pendingRoom,
  pendingRoute,
  onJoinRoom,
  onDeclineRoom,
  onSetIdentity,
  onAcceptRoute,
  onDeclineRoute,
}: Props) {
  const { t } = useI18n()
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)

  // `?room=` stays in the address after joining, so a reload offers the invitation again rather
  // than reconnecting silently. That is right for the parameter and wrong for a dialog: keyed on
  // it alone this would sit over the session it had just opened. A route is not gated the same
  // way — one can be offered during a session, and joining a peer is what would discard it.
  const room = collab.status === 'off' ? pendingRoom : null
  // A room outranks a route. Joining replaces the document from the peer anyway, so applying a
  // route first is work immediately thrown away. The page already nulls one of the two; the
  // precedence is repeated here so the component answers for itself rather than for its caller.
  const offeredRoute = room ? null : pendingRoute ?? null
  /** What is on offer, so a link naming a different room or route places focus afresh. */
  const offer = room ?? offeredRoute

  const hasName = !!collab.identity?.trim()
  const decline = room ? onDeclineRoom : onDeclineRoute

  // Focus is placed when the dialog appears, not moved as the name is typed — which is why
  // `hasName` is read here but is deliberately not a dependency: gaining a name mid-keystroke
  // would otherwise pull the caret out of the field and onto the button.
  useEffect(() => {
    if (!offer) return
    const target = !hasName && nameRef.current ? nameRef.current : primaryRef.current
    target?.focus()
  }, [offer])

  if (!offer) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.stopPropagation()
        decline?.()
      }}
    >
      {/* A backdrop, not a button: it carries no label and is not a control in its own right.
          `fixed`, not `absolute`: the container carries padding so the card never touches the edge
          of a small screen, and an absolute backdrop would resolve against that padding box —
          leaving an undimmed strip along the bottom. */}
      <div
        data-arrival-backdrop
        className="fixed inset-0 bg-ink-950/70"
        onClick={() => decline?.()}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-gold-500/40 bg-ink-900 p-4 shadow-2xl"
      >
        <h2 id={titleId} className="text-sm font-semibold text-gold-400">
          {t(room ? 'collab.invitationTitle' : 'route.offerTitle')}
        </h2>

        {room ? (
          <>
            <p className="mt-2 text-xs text-ink-300">{t('collab.invitation', { room })}</p>
            <div className="mt-3">
              <NameField
                identity={collab.identity}
                onSetIdentity={onSetIdentity}
                t={t}
                ref={nameRef}
              />
            </div>
            <div className="mt-1 flex gap-2">
              <button
                ref={primaryRef}
                onClick={() => onJoinRoom(room, 'guest')}
                disabled={!hasName}
                className="flex-1 rounded border border-gold-500/60 bg-gold-500/10 px-2 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 disabled:opacity-40"
              >
                {t('collab.acceptInvitation', { room })}
              </button>
              <button
                onClick={() => onDeclineRoom?.()}
                className="rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-400 hover:border-ink-600 hover:text-ink-200"
              >
                {t('collab.declineInvitation')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-xs text-ink-300">{t('route.routeOffer')}</p>
            <div className="mt-3 flex gap-2">
              <button
                ref={primaryRef}
                onClick={onAcceptRoute}
                className="flex-1 rounded border border-gold-500/60 bg-gold-500/10 px-2 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20"
              >
                {t('route.acceptRoute')}
              </button>
              <button
                onClick={() => onDeclineRoute?.()}
                className="rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-400 hover:border-ink-600 hover:text-ink-200"
              >
                {t('route.declineRoute')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
