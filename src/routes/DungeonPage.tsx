// ABOUTME: A dungeon's page: the map beside either the codex panel or the route panel.
// ABOUTME: Holds the selection and hover state that ties the two halves together.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DungeonHeader from '../components/DungeonHeader'
import UnknownDungeon from '../components/UnknownDungeon'
import DungeonMap, { type PullMark, type PullShape } from '../components/map/DungeonMap'
import RelayNotice from '../components/map/RelayNotice'
import CodexPanel, { type PullRef } from '../components/codex/CodexPanel'
import RoutePanel from '../components/route/RoutePanel'
import MobPanel from '../components/route/MobPanel'
import ObjectToolbar, { type Tool } from '../components/route/ObjectToolbar'
import { cloneKey, getLookup } from '../lib/data'
import { toCssColor } from '../lib/mdt/route'
import { useRouteDoc } from '../lib/mdt/useRouteDoc'
import { PULL_OUTLINE_PADDING, convexHull, expandPolygon, toPixels } from '../lib/geometry'
import { useI18n } from '../lib/i18n/context'
import type { CloneRef, Enemy } from '../lib/types'

type Mode = 'codex' | 'route'

export default function DungeonPage({ mode }: { mode: Mode }) {
  const { slug = '', npcId } = useParams()
  const lookup = getLookup(slug)

  if (!lookup) return <UnknownDungeon />

  // The key forces a full remount when the dungeon changes: the route document and the
  // selections start from scratch, with no state left over from one dungeon to the next.
  return <DungeonView key={slug} slug={slug} npcId={npcId} mode={mode} />
}

function DungeonView({ slug, npcId, mode }: { slug: string; npcId?: string; mode: Mode }) {
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

  // `mode` is which address you're on, not state — an invitation must still reach the route
  // panel no matter which tab it arrived on, so a codex address carrying `?room=` redirects to
  // the route one, keeping the room in the query. A join link pasted into a tab already on this
  // dungeon only changes the hash, which does not remount `DungeonPage` — reacting to
  // `pendingRoom` here is what makes the invitation appear without a reload. It only ever pushes
  // you onto the route address: once there, choosing another tab is not undone by this effect.
  useEffect(() => {
    if (pendingRoom && mode !== 'route') {
      navigate(`/d/${slug}/route?room=${pendingRoom}`, { replace: true })
    }
  }, [pendingRoom, mode, navigate, slug])

  const [selectedPack, setSelectedPack] = useState<number | null>(null)
  const [hoveredNpc, setHoveredNpc] = useState<number | null>(null)
  const [focusNpc, setFocusNpc] = useState<number | null>(null)
  const [currentPull, setCurrentPull] = useState(0)
  const [hoveredPull, setHoveredPull] = useState<number | null>(null)

  /** The mob the route tab's left column shows. Kept when the cursor leaves the map, so the
      entry stays readable. */
  const [panelNpc, setPanelNpc] = useState<number | null>(null)
  /** Set by a right-click: the column stops following the hover until it is released. */
  const [frozenNpc, setFrozenNpc] = useState<number | null>(null)
  /** The mob under the cursor right now, null once it leaves — not the same thing as the one
      the column shows. Needed only to tell whether the map tooltip would repeat the column: see
      `suppressCloneTooltip` below. */
  const [cursorNpc, setCursorNpc] = useState<number | null>(null)

  /** The active drawing tool, or null when the map is just a map. */
  const [tool, setTool] = useState<Tool | null>(null)

  const {
    route,
    actions,
    collab,
    joinRoom,
    leaveRoom,
    resumeRoom,
    setIdentity,
    setCursor,
    canUndo,
    canRedo,
  } = useRouteDoc(slug, lookup.dungeon.mdtIndex)

  // Escape drops the active tool, so there is always a keyboard way back to panning. Only
  // listens in Route mode: the codex tab never has a tool to drop.
  useEffect(() => {
    if (mode !== 'route') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTool(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode])

  // A session that just ended must not offer its room right back — whether left from the
  // panel or from the relay notice, both go through here.
  const handleLeaveRoom = useCallback(() => {
    setDeclined(room)
    leaveRoom()
  }, [leaveRoom, room])

  const selectedMob = npcId ? Number(npcId) : null
  const hasRoute = route.pulls.some((p) => p.clones.length > 0)

  // A briefing chip links to `…/codex/mob/<npc>#spell-<id>`. Reading the fragment here rather
  // than in the panel keeps the panel router-free, the same split as `selectedMob` above.
  const { hash } = useLocation()
  const focusSpell = Number(/^#spell-(\d+)$/.exec(hash)?.[1]) || null

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
        if (selectedMob != null) navigate(`/d/${slug}/codex`)
        return
      }

      const targets: CloneRef[] =
        additive || entry.clone.g == null ? [ref] : (lookup.packs.get(entry.clone.g)?.members ?? [ref])
      actions.toggleClones(currentPull, targets)
    },
    [lookup, mode, currentPull, actions, navigate, slug, selectedMob],
  )

  // A plain helper, redefined every render — it must not appear in a `useCallback` dependency
  // array below. `lookup` is what those depend on instead.
  const enemyOf = (ref: CloneRef | null): Enemy | null =>
    ref ? (lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx))?.enemy ?? null) : null

  const handleHoverClone = useCallback(
    (ref: CloneRef | null) => {
      const id = enemyOf(ref)?.id ?? null
      setCursorNpc(id)
      // A null means the cursor left a blip: the column keeps what it had.
      if (id != null && frozenNpc == null) setPanelNpc(id)
    },
    [lookup, frozenNpc],
  )

  const handleCloneContextMenu = useCallback(
    (ref: CloneRef) => {
      const id = enemyOf(ref)?.id
      if (id == null) return
      setFrozenNpc(id)
      setPanelNpc(id)
    },
    [lookup],
  )

  const panelEnemy = panelNpc != null ? (lookup.enemyById.get(panelNpc) ?? null) : null

  return (
    <div className="flex h-full flex-col">
      <DungeonHeader
        slug={slug}
        lookup={lookup}
        view={mode}
        note={hasRoute ? t('dungeon.route', { name: route.name }) : undefined}
      >
        {collab.status !== 'off' && (
          <span className="rounded border border-threat-low/40 bg-threat-low/10 px-2 py-1 text-[11px] text-threat-low">
            {collab.room} · {collab.peers.length}
          </span>
        )}
      </DungeonHeader>

      <div className="flex min-h-0 flex-1">
        {mode === 'route' && (
          <aside
            data-testid="mob-panel"
            className="thin-scroll w-[360px] shrink-0 space-y-2 overflow-y-auto border-r border-ink-800 bg-ink-900 p-3"
          >
            <ObjectToolbar
              tool={tool}
              onTool={setTool}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={actions.undo}
              onRedo={actions.redo}
            />
            {/* Weighing a pack and marking the map are different tasks; 360px shared between
                them would serve neither. The toolbar stays, so there is always a way back. */}
            {tool == null ? (
              <MobPanel
                slug={slug}
                dungeon={lookup.dungeon}
                enemy={panelEnemy}
                frozen={frozenNpc != null}
                onUnfreeze={() => setFrozenNpc(null)}
              />
            ) : null}
          </aside>
        )}
        <div className="min-w-0 flex-1">
          <DungeonMap
            slug={slug}
            lookup={lookup}
            highlighted={highlighted}
            pullMarks={pullMarks}
            pullShapes={pullShapes}
            objects={mode === 'route' ? route.objects : undefined}
            hoveredPull={hoveredPull}
            selectedPack={mode === 'codex' ? selectedPack : null}
            onCloneClick={handleCloneClick}
            // Route mode only: in the codex tab nothing reads `cursorNpc`/`panelNpc`, so
            // wiring this unconditionally would re-render `DungeonView` — and with it an
            // unmemoised `CodexPanel` full of `MobCard`s — on every blip enter and leave for no
            // reader at all.
            onHoverClone={mode === 'route' ? handleHoverClone : undefined}
            onCloneContextMenu={mode === 'route' ? handleCloneContextMenu : undefined}
            // Hidden whenever nothing is frozen (the column already follows the hover), and
            // also while the cursor sits on the very mob just frozen by a right-click — that
            // gesture leaves the map's own `hoverClone` pointed at that mob, and a tooltip
            // would repeat exactly what the column now pins. Compared by enemy id, not clone
            // key: hovering a *different clone of the same frozen enemy* hides the tooltip too,
            // on purpose — the column already shows that enemy's numbers, so repeating them in
            // a tooltip would be the same redundancy this suppression exists to prevent.
            suppressCloneTooltip={mode === 'route' && (frozenNpc == null || cursorNpc === frozenNpc)}
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
              focusSpell={focusSpell}
              pullByNpc={pullByNpc}
              onSelectMob={(id) => {
                setFocusNpc(id)
                navigate(id == null ? `/d/${slug}/codex` : `/d/${slug}/codex/mob/${id}`)
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
                setFocusNpc(id)
                navigate(`/d/${slug}/codex/mob/${id}`)
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
