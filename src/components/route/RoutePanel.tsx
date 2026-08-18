// ABOUTME: The route side panel: forces, pull list and briefings, MDT import/export, sharing.
// ABOUTME: Owns no route state — every change goes through the actions of useRouteDoc.

import { useEffect, useMemo, useState } from 'react'
import type { DungeonLookup } from '../../lib/data'
import { cloneKey, getNpcLabel } from '../../lib/data'
import { getMobContent, inlineMarkdown } from '../../lib/content'
import { frontalList, getIndicators, kickList } from '../../lib/indicators'
import { encodeMdtString } from '../../lib/mdt/string'
import { MdtUserError } from '../../lib/mdt/errors'
import {
  forcesStanding,
  routeStats,
  routeToLua,
  toCssColor,
  type ForcesStanding,
  type Route,
} from '../../lib/mdt/route'
import type { CollabState, RouteActions } from '../../lib/mdt/useRouteDoc'
import { randomRoomCode } from '../../lib/mdt/useRouteDoc'
import { useI18n } from '../../lib/i18n/context'
import type { I18n } from '../../lib/i18n/context'
import type { Enemy } from '../../lib/types'

/**
 * The forces readout is three elements deep — the running total, the percentage and the bar —
 * and all three say the same thing about the same number. Keeping the mapping in one place is
 * what stops them disagreeing.
 */
const FORCES_TOTAL_CLASS: Record<ForcesStanding, string> = {
  short: 'text-ink-100',
  complete: 'text-threat-low',
  over: 'text-threat-lethal',
}
const FORCES_PERCENT_CLASS: Record<ForcesStanding, string> = {
  short: 'text-gold-400',
  complete: 'text-threat-low',
  over: 'text-threat-lethal',
}
const FORCES_BAR_CLASS: Record<ForcesStanding, string> = {
  short: 'bg-gold-500',
  complete: 'bg-threat-low',
  over: 'bg-threat-lethal',
}

interface Props {
  slug: string
  lookup: DungeonLookup
  route: Route
  actions: RouteActions
  currentPull: number
  onCurrentPullChange: (index: number) => void
  hoveredPull: number | null
  onHoverPull: (index: number | null) => void
  onFocusMob: (npcId: number) => void
  collab: CollabState
  onJoinRoom: (room: string, mode: 'host' | 'guest') => void
  onLeaveRoom: () => void
  onResumeRoom: () => void
  onSetIdentity: (name: string) => void
  pendingRoom: string | null
}

/**
 * A link that carries the room.
 *
 * The build is served statically under a hash router, so the room has to live inside the
 * hash. `location.pathname` already carries whatever prefix the host adds — nothing about
 * the deployment is repeated here.
 */
export function sessionLink(slug: string, room: string): string {
  return `${location.origin}${location.pathname}#/d/${slug}/route?room=${room}`
}

/**
 * Import and export failures, as a sentence to show.
 *
 * Only `MdtUserError` is translated: the codec's other errors are diagnostics ("CBOR:
 * truncated string") that mean a bug rather than a bad paste, and are more useful verbatim.
 */
function errorText(err: unknown, t: I18n['t']): string {
  if (err instanceof MdtUserError) return t(`mdtError.${err.code}`, err.params)
  return err instanceof Error ? err.message : String(err)
}

export default function RoutePanel({
  slug,
  lookup,
  route,
  actions,
  currentPull,
  onCurrentPullChange,
  hoveredPull,
  onHoverPull,
  onFocusMob,
  collab,
  onJoinRoom,
  onLeaveRoom,
  onResumeRoom,
  onSetIdentity,
  pendingRoom,
}: Props) {
  const { t, plural, formatPercent, locale } = useI18n()
  const [importText, setImportText] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  /** The pull being dragged, and the row it would land on. Both null when nothing is dragging. */
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dropOver, setDropOver] = useState<number | null>(null)

  const endDrag = () => {
    setDragFrom(null)
    setDropOver(null)
  }

  const stats = routeStats(route, lookup)
  const standing = forcesStanding(stats.percent)

  /** Whether anything has been pulled yet — a route with no clones is nothing to show. */
  const hasRoute = route.pulls.some((pull) => pull.clones.length > 0)

  /** Distinct mobs in a pull, with their unit count. */
  const pullMobs = useMemo(() => {
    return route.pulls.map((pull) => {
      const counts = new Map<number, { enemy: Enemy; n: number }>()
      for (const ref of pull.clones) {
        const entry = lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))
        if (!entry) continue
        const hit = counts.get(entry.enemy.id)
        if (hit) hit.n++
        else counts.set(entry.enemy.id, { enemy: entry.enemy, n: 1 })
      }
      return [...counts.values()].sort((a, b) => b.enemy.count * b.n - a.enemy.count * a.n)
    })
  }, [route.pulls, lookup])

  const handleImport = () => {
    try {
      const imported = actions.importRoute(importText)
      if (imported.slug !== slug) {
        setMessage({
          kind: 'error',
          text: t('route.wrongDungeon', { dungeon: imported.slug.replace(/-/g, ' ') }),
        })
        return
      }
      onCurrentPullChange(Math.max(0, imported.pulls.length - 1))
      setImportText('')
      setMessage({
        kind: 'ok',
        text: plural('route.imported', imported.pulls.length, { name: imported.name }),
      })
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err, t) })
    }
  }

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(encodeMdtString(routeToLua(route)))
      setMessage({ kind: 'ok', text: t('route.copied') })
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err, t) })
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-ink-700 bg-ink-850 p-3">
        <input
          value={route.name}
          onChange={(e) => actions.setName(e.target.value)}
          className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
          placeholder={t('route.namePlaceholder')}
        />

        <div className="mt-3 flex items-baseline justify-between text-sm">
          <span className="text-ink-400">{t('route.forces')}</span>
          <span className="tabular-nums">
            <span className={FORCES_TOTAL_CLASS[standing]}>{stats.total}</span>
            <span className="text-ink-600"> / {stats.required}</span>
            <span className={`ml-2 ${FORCES_PERCENT_CLASS[standing]}`}>
              {formatPercent(stats.percent, 1)}
            </span>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-800">
          <div
            data-standing={standing}
            className={`h-full rounded-full ${FORCES_BAR_CLASS[standing]}`}
            style={{ width: `${Math.min(100, stats.percent)}%` }}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 rounded border border-gold-500/60 bg-gold-500/10 px-2 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20"
          >
            {t('route.copy')}
          </button>
          <button
            onClick={() => {
              actions.addPull()
              // Switch to the pull we just created, otherwise the next click on the map
              // would feed the old one.
              onCurrentPullChange(route.pulls.length)
            }}
            className="rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400"
          >
            {t('route.addPull')}
          </button>
        </div>
      </section>

      {/* A pause is a decision, not a failure: "fetching the route" would be a lie while the
          socket is closed on purpose. */}
      {collab.status !== 'paused' && collab.mode === 'guest' && !collab.synced && !hasRoute && (
        <p className="rounded border border-ink-700 bg-ink-850 px-3 py-2 text-xs text-ink-400">
          {t('collab.awaitingRoom')}
        </p>
      )}

      <section>
        <h3 className="mb-2 text-[10px] font-bold tracking-widest text-ink-400">
          {t('route.pulls', { n: route.pulls.length })}
        </h3>
        <ol className="space-y-1.5">
          {route.pulls.map((pull, i) => {
            const active = i === currentPull
            const forces = stats.cumulative[i] - (i > 0 ? stats.cumulative[i - 1] : 0)
            const mobs = pullMobs[i]
            const isOpen = expanded === i
            const isDropTarget = dragFrom != null && dragFrom !== i && dropOver === i

            return (
              <li
                key={i}
                draggable
                data-drop-target={isDropTarget ? 'true' : undefined}
                onDragStart={(e) => {
                  setDragFrom(i)
                  // Firefox refuses to start a drag without payload, and `effectAllowed`
                  // is what makes the cursor say "move" rather than "copy".
                  e.dataTransfer?.setData?.('text/plain', String(i))
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (dragFrom == null) return
                  // Without this the browser refuses the drop outright.
                  e.preventDefault()
                  setDropOver(i)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  // One call, whatever the distance: `movePull` takes an arbitrary delta, so
                  // dropping four rows down is a single edit rather than four replicated ones.
                  if (dragFrom != null && dragFrom !== i) {
                    actions.movePull(dragFrom, i - dragFrom)
                    onCurrentPullChange(i)
                  }
                  endDrag()
                }}
                onDragEnd={endDrag}
                onClick={() => onCurrentPullChange(i)}
                onMouseEnter={() => onHoverPull(i)}
                onMouseLeave={() => onHoverPull(null)}
                className={`cursor-pointer rounded border transition ${
                  dragFrom === i ? 'opacity-40 ' : ''
                }${isDropTarget ? 'ring-1 ring-gold-500 ' : ''}${
                  active
                    ? 'border-gold-500 bg-gold-500/10'
                    : hoveredPull === i
                      ? 'border-ink-600 bg-ink-800'
                      : 'border-ink-700 bg-ink-850'
                }`}
              >
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-ink-950"
                    style={{ background: toCssColor(pull.color) }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-xs text-ink-300">
                    {mobs.length
                      ? mobs.map((m) => `${m.n}× ${getNpcLabel(m.enemy, locale).name}`).join(', ')
                      : t('route.emptyPull')}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-400 tabular-nums">
                    +{forces} · {formatPercent((stats.cumulative[i] / stats.required) * 100)}
                  </span>
                </div>

                {/* The pull briefing: what you need to know before engaging it. */}
                {isOpen && mobs.length > 0 && (
                  <div className="border-t border-ink-700/60 px-2 py-2">
                    {mobs.map(({ enemy, n }) => (
                      <PullMobLine
                        key={enemy.id}
                        slug={slug}
                        enemy={enemy}
                        n={n}
                        onClick={() => onFocusMob(enemy.id)}
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 px-2 pb-1.5 text-[10px]">
                  <button
                    className="rounded px-1 text-ink-500 hover:text-gold-400"
                    onClick={(e) => (e.stopPropagation(), setExpanded(isOpen ? null : i))}
                  >
                    {isOpen ? t('route.hide') : t('route.briefing')}
                  </button>
                  <span className="flex-1" />
                  <button
                    className="rounded px-1 text-ink-600 hover:text-gold-400"
                    onClick={(e) => (e.stopPropagation(), actions.movePull(i, -1), onCurrentPullChange(Math.max(0, i - 1)))}
                    title={t('route.moveUp')}
                  >
                    ▲
                  </button>
                  <button
                    className="rounded px-1 text-ink-600 hover:text-gold-400"
                    onClick={(e) => (e.stopPropagation(), actions.movePull(i, 1), onCurrentPullChange(Math.min(route.pulls.length - 1, i + 1)))}
                    title={t('route.moveDown')}
                  >
                    ▼
                  </button>
                  <button
                    className="rounded px-1 text-ink-600 hover:text-threat-lethal"
                    onClick={(e) => (e.stopPropagation(), actions.removePull(i), onCurrentPullChange(Math.max(0, i - 1)))}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
        <p className="mt-2 text-[11px] text-ink-600">{t('route.hint')}</p>
      </section>

      <CollabSection
        slug={slug}
        collab={collab}
        pendingRoom={pendingRoom}
        onJoinRoom={onJoinRoom}
        onLeaveRoom={onLeaveRoom}
        onResumeRoom={onResumeRoom}
        onSetIdentity={onSetIdentity}
        onMessage={setMessage}
      />

      <section className="rounded-lg border border-ink-700 bg-ink-850 p-3">
        <h3 className="mb-2 text-[10px] font-bold tracking-widest text-ink-400">{t('route.import')}</h3>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder={t('route.importPlaceholder')}
          rows={3}
          className="thin-scroll w-full resize-none rounded border border-ink-700 bg-ink-900 px-2 py-1.5 font-mono text-[11px] text-ink-300 focus:border-gold-500 focus:outline-none"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="flex-1 rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400 disabled:opacity-40"
          >
            {t('route.importAction')}
          </button>
          <button
            onClick={() => (actions.reset(), onCurrentPullChange(0))}
            className="rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-500 hover:border-threat-lethal hover:text-threat-lethal"
          >
            {t('route.clear')}
          </button>
        </div>
      </section>

      {message && (
        <p
          className={`rounded border px-3 py-2 text-xs ${
            message.kind === 'ok'
              ? 'border-threat-low/40 bg-threat-low/10 text-threat-low'
              : 'border-threat-lethal/40 bg-threat-lethal/10 text-threat-lethal'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  )
}

function PullMobLine({
  slug,
  enemy,
  n,
  onClick,
}: {
  slug: string
  enemy: Enemy
  n: number
  onClick: () => void
}) {
  const { t, locale } = useI18n()
  const ind = getIndicators(slug, enemy, locale)
  const kicks = kickList(slug, enemy, locale)
  // Only frontals reach the briefing. `dodge` and `soak` stay in the codex: `dodge` is used
  // across the entries for anything worth noticing, so printing it here would bury the rest.
  const frontals = frontalList(slug, enemy, locale)
  const trap = getMobContent(slug, enemy.id, locale)?.trap

  return (
    <div
      className="mb-1.5 rounded px-1 py-0.5 last:mb-0 hover:bg-ink-800"
      onClick={(e) => (e.stopPropagation(), onClick())}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-ink-100">
          {n}× {getNpcLabel(enemy, locale).name}
        </span>
        {ind.tankBuster && <span className="text-[9px] font-bold text-tag-tank">{t('tag.tank')}</span>}
        {ind.priority && <span className="text-[9px] font-bold text-gold-400">{t('route.prio')}</span>}
      </div>
      {kicks.length > 0 && (
        <div className="text-[11px] text-tag-kick">
          {t('route.kickList', { spells: kicks.map((k) => k.name).join(', ') })}
        </div>
      )}
      {frontals.length > 0 && (
        <div className="text-[11px] text-tag-frontal">
          {t('route.frontalList', { spells: frontals.map((f) => f.name).join(', ') })}
        </div>
      )}
      {trap && (
        <div className="text-[11px] text-threat-lethal">
          ⚠ <span dangerouslySetInnerHTML={{ __html: inlineMarkdown(trap) }} />
        </div>
      )}
    </div>
  )
}

function CollabSection({
  slug,
  collab,
  pendingRoom,
  onJoinRoom,
  onLeaveRoom,
  onResumeRoom,
  onSetIdentity,
  onMessage,
}: {
  slug: string
  collab: CollabState
  pendingRoom: string | null
  onJoinRoom: (room: string, mode: 'host' | 'guest') => void
  onLeaveRoom: () => void
  onResumeRoom: () => void
  onSetIdentity: (name: string) => void
  onMessage: (m: { kind: 'ok' | 'error'; text: string }) => void
}) {
  const { t, plural } = useI18n()
  const [code, setCode] = useState('')
  const hasName = !!collab.identity?.trim()

  if (collab.status !== 'off') {
    return (
      <section className="rounded-lg border border-threat-low/40 bg-threat-low/5 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-threat-low">
              {t('collab.heading')}
            </div>
            <div className="mt-0.5 font-mono text-lg tracking-widest text-ink-100">{collab.room}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-300">
              {collab.status === 'paused'
                ? t('collab.paused')
                : collab.status === 'connected'
                  ? plural('collab.connected', collab.peers.length)
                  : t('collab.connecting')}
            </div>
            <NameField identity={collab.identity} onSetIdentity={onSetIdentity} t={t} />
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          {collab.status === 'paused' ? (
            <button
              onClick={onResumeRoom}
              className="flex-1 rounded border border-threat-low/60 px-2 py-1 text-xs text-threat-low hover:border-gold-500 hover:text-gold-400"
            >
              {t('collab.resume')}
            </button>
          ) : (
            <>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(collab.room ?? '')
                  onMessage({ kind: 'ok', text: t('route.codeCopied') })
                }}
                className="flex-1 rounded border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400"
              >
                {t('collab.copyCode')}
              </button>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(sessionLink(slug, collab.room ?? ''))
                    onMessage({ kind: 'ok', text: t('route.linkCopied') })
                  } catch (err) {
                    onMessage({ kind: 'error', text: errorText(err, t) })
                  }
                }}
                className="flex-1 rounded border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400"
              >
                {t('collab.copyLink')}
              </button>
            </>
          )}
          <button
            onClick={onLeaveRoom}
            className="rounded border border-ink-700 px-2 py-1 text-xs text-ink-500 hover:border-threat-lethal hover:text-threat-lethal"
          >
            {t('collab.leave')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-ink-700 bg-ink-850 p-3">
      <h3 className="mb-2 text-[10px] font-bold tracking-widest text-ink-400">
        {t('collab.editTogether')}
      </h3>
      <NameField identity={collab.identity} onSetIdentity={onSetIdentity} t={t} />
      {pendingRoom && (
        <div className="mb-3 rounded border border-gold-500/40 bg-gold-500/5 p-2">
          <p className="text-[11px] text-ink-300">{t('collab.invitation', { room: pendingRoom })}</p>
          <button
            onClick={() => onJoinRoom(pendingRoom, 'guest')}
            disabled={!hasName}
            className="mt-2 w-full rounded border border-gold-500/60 bg-gold-500/10 px-2 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 disabled:opacity-40"
          >
            {t('collab.acceptInvitation', { room: pendingRoom })}
          </button>
        </div>
      )}
      <button
        onClick={() => onJoinRoom(randomRoomCode(), 'host')}
        disabled={!hasName}
        className="w-full rounded border border-gold-500/60 bg-gold-500/10 px-2 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20 disabled:opacity-40"
      >
        {t('collab.openSession')}
      </button>
      <div className="mt-2 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t('collab.codePlaceholder')}
          maxLength={6}
          className="w-24 rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-center font-mono text-xs tracking-widest text-ink-100 focus:border-gold-500 focus:outline-none"
        />
        <button
          onClick={() => onJoinRoom(code.trim(), 'guest')}
          disabled={!hasName || code.trim().length < 4}
          className="flex-1 rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400 disabled:opacity-40"
        >
          {t('collab.join')}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink-600">{t('collab.hint')}</p>
    </section>
  )
}

/**
 * The participant's own name: blank on a first visit, so choosing one is a real step rather
 * than accepting an invented default without reading it. Stays editable once a session is
 * open, since names get picked badly the first time.
 */
function NameField({
  identity,
  onSetIdentity,
  t,
}: {
  identity: string | null
  onSetIdentity: (name: string) => void
  t: I18n['t']
}) {
  // `identity` comes back trimmed on every call (`setIdentity` normalises what gets persisted
  // and replicated to peers), so binding the input straight to it would erase a trailing space
  // the instant it was typed, and the next character would land against the trimmed string.
  // This field keeps its own buffer holding exactly what was typed, and only accepts a value
  // from outside when it isn't simply the trimmed echo of what this buffer already holds —
  // otherwise a change from elsewhere (the stored name loading, a session reset) would never
  // reach the field.
  const [value, setValue] = useState(identity ?? '')
  useEffect(() => {
    setValue((current) => (current.trim() === (identity ?? '') ? current : identity ?? ''))
  }, [identity])

  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[10px] font-bold tracking-widest text-ink-400">
        {t('collab.name')}
      </span>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          onSetIdentity(e.target.value)
        }}
        placeholder={t('collab.namePlaceholder')}
        maxLength={20}
        className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
      />
    </label>
  )
}
