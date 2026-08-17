// ABOUTME: A dungeon's page: the map beside either the codex panel or the route panel.
// ABOUTME: Holds the selection and hover state that ties the two halves together.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DungeonHeader from '../components/DungeonHeader'
import DungeonMap, { type PullMark, type PullShape } from '../components/map/DungeonMap'
import RelayNotice from '../components/map/RelayNotice'
import CodexPanel, { type PullRef } from '../components/codex/CodexPanel'
import RoutePanel from '../components/route/RoutePanel'
import { cloneKey, getLookup } from '../lib/data'
import { toCssColor } from '../lib/mdt/route'
import { useRouteDoc } from '../lib/mdt/useRouteDoc'
import { PULL_OUTLINE_PADDING, convexHull, expandPolygon, toPixels } from '../lib/geometry'
import { useI18n } from '../lib/i18n/context'
import type { CloneRef } from '../lib/types'

type Mode = 'codex' | 'route'

export default function DungeonPage() {
  const { slug = '', npcId } = useParams()
  const { t } = useI18n()
  const lookup = getLookup(slug)

  if (!lookup) {
    return (
      <div className="p-8">
        <p className="text-ink-300">{t('dungeon.unknown')}</p>
        <Link to="/" className="text-gold-400 hover:underline">
          {t('dungeon.backHome')}
        </Link>
      </div>
    )
  }

  // The key forces a full remount when the dungeon changes: the route document and the
  // selections start from scratch, with no state left over from one dungeon to the next.
  return <DungeonView key={slug} slug={slug} npcId={npcId} />
}

function DungeonView({ slug, npcId }: { slug: string; npcId?: string }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  const lookup = getLookup(slug)!

  // The room a join link carries. `?room=` stays in the URL after arrival, so a reload offers
  // the invitation again rather than reconnecting silently — but leaving the session it led to
  // must not offer it right back to the person who just escaped it. `declined` holds the
  // specific code just left, not a flag: a flag would keep suppressing every *other* room a
  // later link might carry, for as long as the tab stayed mounted. Component state, so a
  // reload (a fresh `declined`) still offers the room again.
  const [searchParams] = useSearchParams()
  const [declined, setDeclined] = useState<string | null>(null)
  const room = searchParams.get('room')
  const pendingRoom = room && room !== declined ? room : null

  const [mode, setMode] = useState<Mode>(pendingRoom ? 'route' : 'codex')

  // A join link pasted into a tab already on this dungeon only changes the hash, which does
  // not remount `DungeonPage` — the `useState` above only seeds the initial mode. Reacting to
  // `pendingRoom` here is what makes the invitation appear without a reload. It only ever
  // turns route mode *on*: once `pendingRoom` stops changing, a reader who clicks back to
  // Codex stays there.
  useEffect(() => {
    if (pendingRoom) setMode('route')
  }, [pendingRoom])

  const [selectedPack, setSelectedPack] = useState<number | null>(null)
  const [hoveredNpc, setHoveredNpc] = useState<number | null>(null)
  const [focusNpc, setFocusNpc] = useState<number | null>(null)
  const [currentPull, setCurrentPull] = useState(0)
  const [hoveredPull, setHoveredPull] = useState<number | null>(null)

  const { route, actions, collab, joinRoom, leaveRoom, resumeRoom, setIdentity, setCursor } = useRouteDoc(
    slug,
    lookup.dungeon.mdtIndex,
  )

  // A session that just ended must not offer its room right back — whether left from the
  // panel or from the relay notice, both go through here.
  const handleLeaveRoom = useCallback(() => {
    setDeclined(room)
    leaveRoom()
  }, [leaveRoom, room])

  const selectedMob = npcId ? Number(npcId) : null
  const hasRoute = route.pulls.some((p) => p.clones.length > 0)

  const pullMarks = useMemo(() => {
    const map = new Map<string, PullMark>()
    if (mode !== 'route') return map
    route.pulls.forEach((pull, i) => {
      for (const ref of pull.clones) {
        map.set(cloneKey(ref.enemyIdx, ref.cloneIdx), { pullIdx: i, color: toCssColor(pull.color) })
      }
    })
    return map
  }, [mode, route])

  /** Outline around each pull's clones — how MDT reads as an itinerary. */
  const pullShapes = useMemo<PullShape[]>(() => {
    if (mode !== 'route') return []
    return route.pulls.flatMap((pull, index) => {
      const points = pull.clones
        .map((ref) => lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx)))
        .filter((e) => e != null)
        .map((e) => toPixels(e!.clone.x, e!.clone.y))
      if (!points.length) return []

      const hull = expandPolygon(convexHull(points), PULL_OUTLINE_PADDING)
      return [
        {
          index,
          color: toCssColor(pull.color),
          hull,
          center: {
            x: points.reduce((s, p) => s + p.x, 0) / points.length,
            y: points.reduce((s, p) => s + p.y, 0) / points.length,
          },
          count: pull.clones.length,
        },
      ]
    })
  }, [mode, route, lookup])

  /** Which pull each mob belongs to: this is what ties the codex to the route. */
  const pullByNpc = useMemo(() => {
    const map = new Map<number, PullRef>()
    route.pulls.forEach((pull, index) => {
      for (const ref of pull.clones) {
        const entry = lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))
        if (entry && !map.has(entry.enemy.id)) {
          map.set(entry.enemy.id, { index, color: toCssColor(pull.color) })
        }
      }
    })
    return map
  }, [route, lookup])

  const highlighted = useMemo(() => {
    const set = new Set<string>()

    // Hovering a pull in the list highlights its mobs on the map, and the other way round.
    if (hoveredPull != null && route.pulls[hoveredPull]) {
      for (const ref of route.pulls[hoveredPull].clones) {
        set.add(cloneKey(ref.enemyIdx, ref.cloneIdx))
      }
      return set
    }

    const target = hoveredNpc ?? focusNpc ?? selectedMob
    if (target == null) return set
    for (const enemy of lookup.dungeon.enemies) {
      if (enemy.id !== target) continue
      for (const clone of enemy.clones) set.add(cloneKey(enemy.mdtIdx, clone.mdtIdx))
    }
    return set
  }, [hoveredNpc, focusNpc, selectedMob, hoveredPull, route.pulls, lookup])

  const handleCloneClick = useCallback(
    (ref: CloneRef, additive: boolean) => {
      const entry = lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))
      if (!entry) return

      if (mode === 'codex') {
        setSelectedPack(entry.clone.g ?? null)
        // The panel scrolls to the clicked unit rather than leaving you to look for it.
        setFocusNpc(entry.enemy.id)
        if (selectedMob != null) navigate(`/d/${slug}`)
        return
      }

      const targets: CloneRef[] =
        additive || entry.clone.g == null ? [ref] : (lookup.packs.get(entry.clone.g)?.members ?? [ref])
      actions.toggleClones(currentPull, targets)
    },
    [lookup, mode, currentPull, actions, navigate, slug, selectedMob],
  )

  const tab = (value: Mode, label: string) => (
    <button
      onClick={() => setMode(value)}
      className={`rounded px-3 py-1 text-xs font-semibold transition ${
        mode === value ? 'bg-gold-500/15 text-gold-400' : 'text-ink-400 hover:text-ink-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="flex h-full flex-col">
      <DungeonHeader
        slug={slug}
        lookup={lookup}
        view="map"
        note={hasRoute ? t('dungeon.route', { name: route.name }) : undefined}
      >
        {collab.status !== 'off' && (
          <span className="rounded border border-threat-low/40 bg-threat-low/10 px-2 py-1 text-[11px] text-threat-low">
            {collab.room} · {collab.peers.length}
          </span>
        )}
        <div className="flex items-center gap-1 rounded-lg border border-ink-800 bg-ink-900 p-0.5">
          {tab('codex', t('tab.codex'))}
          {tab('route', t('tab.route'))}
        </div>
      </DungeonHeader>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <DungeonMap
            slug={slug}
            lookup={lookup}
            highlighted={highlighted}
            pullMarks={pullMarks}
            pullShapes={pullShapes}
            hoveredPull={hoveredPull}
            selectedPack={mode === 'codex' ? selectedPack : null}
            onCloneClick={handleCloneClick}
            onPullClick={setCurrentPull}
            showPackOutlines
            cursors={collab.status === 'off' ? undefined : collab.peers}
            onCursorMove={collab.status === 'off' ? undefined : setCursor}
            notice={
              collab.status === 'off' ? undefined : (
                <RelayNotice
                  // A pause is a decision, not a failure: "the relay is not answering" would be
                  // a lie, and the panel already says what happened.
                  stalled={collab.status !== 'paused' && !collab.synced}
                  onLeave={handleLeaveRoom}
                />
              )
            }
          />
        </div>

        <aside className="thin-scroll w-[400px] shrink-0 overflow-y-auto border-l border-ink-800 bg-ink-900 p-3">
          {mode === 'codex' ? (
            <CodexPanel
              slug={slug}
              lookup={lookup}
              selectedPack={selectedPack}
              selectedMob={selectedMob}
              focusNpc={focusNpc}
              pullByNpc={pullByNpc}
              onSelectMob={(id) => {
                setFocusNpc(id)
                navigate(id == null ? `/d/${slug}` : `/d/${slug}/mob/${id}`)
              }}
              onHoverMob={setHoveredNpc}
              onClearSelection={() => {
                setSelectedPack(null)
                setFocusNpc(null)
              }}
            />
          ) : (
            <RoutePanel
              slug={slug}
              lookup={lookup}
              route={route}
              actions={actions}
              currentPull={currentPull}
              onCurrentPullChange={setCurrentPull}
              hoveredPull={hoveredPull}
              onHoverPull={setHoveredPull}
              onFocusMob={(id) => {
                setMode('codex')
                setFocusNpc(id)
                navigate(`/d/${slug}/mob/${id}`)
              }}
              collab={collab}
              onJoinRoom={joinRoom}
              onLeaveRoom={handleLeaveRoom}
              onResumeRoom={resumeRoom}
              onSetIdentity={setIdentity}
              pendingRoom={pendingRoom}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
