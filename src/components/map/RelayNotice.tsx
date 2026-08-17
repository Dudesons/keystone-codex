// ABOUTME: The notice shown when a session has joined a room that never answers.
// ABOUTME: Waits before speaking, so an ordinary handshake is never mistaken for a failure.

import { useEffect, useState } from 'react'
import { useI18n } from '../../lib/i18n/context'

/**
 * Five seconds before saying anything.
 *
 * A healthy relay converges in under half a second, measured against a local `y-websocket`
 * server with `BroadcastChannel` disabled. Ten times that will not fire out of nervousness,
 * and anything longer than it is no longer a handshake.
 */
const GRACE_MS = 5000

export default function RelayNotice({ stalled, onLeave }: { stalled: boolean; onLeave: () => void }) {
  const { t } = useI18n()
  const [speak, setSpeak] = useState(false)

  useEffect(() => {
    if (!stalled) {
      setSpeak(false)
      return
    }
    // The clock restarts whenever a session falls out of sync, so a relay that dies mid-route
    // gets the same grace as one that never answered.
    const timer = setTimeout(() => setSpeak(true), GRACE_MS)
    return () => clearTimeout(timer)
  }, [stalled])

  if (!speak) return null

  return (
    <div className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded border border-threat-lethal/50 bg-ink-900/95 px-3 py-2 text-xs shadow-lg">
      <span className="text-threat-lethal">⚠ {t('collab.relayStalled')}</span>
      <button
        onClick={onLeave}
        className="rounded border border-ink-700 px-2 py-0.5 text-ink-300 hover:border-gold-500 hover:text-gold-400"
      >
        {t('collab.leave')}
      </button>
    </div>
  )
}
