// ABOUTME: A dungeon's page: the map beside either the codex panel or the route panel.
// ABOUTME: Holds the selection and hover state that ties the two halves together.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import DungeonHeader from '../components/DungeonHeader'
import UnknownDungeon from '../components/UnknownDungeon'
import DungeonMap, { type PullMark, type PullShape } from '../components/map/DungeonMap'
import RelayNotice from '../components/map/RelayNotice'
import CodexPanel, { type PullRef } from '../components/codex/CodexPanel'
import RoutePanel from '../components/route/RoutePanel'
import MobPanel from '../components/route/MobPanel'
import ObjectToolbar, { type Tool } from '../components/route/ObjectToolbar'
import ObjectEditor from '../components/route/ObjectEditor'
import { DEFAULT_COLOUR, DEFAULT_SIZE } from '../components/route/BrushControls'
import { cloneKey, getLookup } from '../lib/data'
import { MDT_ARROW_DEFAULTS, MDT_STROKE_DEFAULTS } from '../lib/mdt/objects'
import { toCssColor } from '../lib/mdt/route'
import { useRouteDoc } from '../lib/mdt/useRouteDoc'
import { PULL_OUTLINE_PADDING, convexHull, expandPolygon, toPixels, type Point } from '../lib/geometry'
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
  /**
   * The brush the next stroke takes. Local on purpose, and deliberately not in the document: it
   * is a preference about what this person draws next, not part of the route, so two people in a
   * session each keep their own rather than fighting over one.
   */
  const [colour, setColour] = useState(DEFAULT_COLOUR)
  const [size, setSize] = useState(DEFAULT_SIZE)
  /** The object being edited, by the id plan 1 puts on a stored object. */
  const [selectedObject, setSelectedObject] = useState<string | null>(null)
  /** The gesture in flight, in map pixels. Empty between gestures. */
  const [progress, setProgress] = useState<Point[]>([])

  const {
    route,
    actions,
    collab,
    joinRoom,
    leaveRoom,
    resumeRoom,
    setIdentity,
    setCursor,
    setDrawing,
    canUndo,
    canRedo,
  } = useRouteDoc(slug, lookup.dungeon.mdtIndex)

  // `undefined` outside a session, the same guard `onCursorMove` uses below: a solo session
  // must publish nothing.
  const publishDrawing = collab.status === 'off' ? undefined : setDrawing

  // A stand-in for `publishDrawing` that the tool-change effect below can read without
  // depending on it. `publishDrawing` flips between `undefined` and `setDrawing` whenever a
  // session opens, pauses or closes — an identity change that effect must not react to, since
  // nothing about a session status flip is a reason to clear the current selection. Updated
  // every render, so the effect always reaches the latest value despite reading through a ref.
  const publishDrawingRef = useRef(publishDrawing)
  publishDrawingRef.current = publishDrawing

  const editing = route.objects.find((o) => o.id === selectedObject) ?? null

  // `sublevel: 1` is hardcoded: every committed dungeon's objects are on sublevel 1, and
  // nothing in the app reads `sublevel` yet.
  const placeNote = (at: Point) => {
    setSelectedObject(actions.addObject({ kind: 'note', at, sublevel: 1, text: '' }))
  }

  /**
   * What clicking an object does — the whole difference between the two tools that can hit one.
   *
   * Erase reuses Select's hit targets rather than growing its own: the wide invisible band over a
   * stroke and a note's pin already exist, and the tool only changes what the click means. That
   * is also why neither tool mounts a `DrawSurface` — a full-map surface would sit over both.
   */
  const handleObjectClick = useCallback(
    (id: string) => {
      if (tool !== 'erase') {
        setSelectedObject(id)
        return
      }
      actions.removeObject(id)
      // The editor is showing whatever was selected; erasing that very object must not leave it
      // pointed at something the document no longer holds.
      setSelectedObject((current) => (current === id ? null : current))
    },
    [tool, actions],
  )

  /**
   * The gesture the active tool wants. One surface serves every tool: a note's click is just the
   * degenerate case of a drag that never moved.
   */
  const drawing = useMemo(() => {
    if (tool === 'note') {
      return { mode: 'point' as const, onCommit: (points: Point[]) => placeNote(points[0]) }
    }
    if (tool === 'arrow') {
      return {
        mode: 'line' as const,
        onProgress: (points: Point[]) => {
          setProgress(points)
          publishDrawing?.(points)
        },
        onCommit: (points: Point[]) => {
          // A press that never moved has no direction, so there is no arrow to make.
          if (points.length < 2) return
          actions.addObject({
            kind: 'stroke',
            points,
            sublevel: 1,
            color: colour,
            isArrow: true,
            // MDT's own defaults still decide `smooth` and `layer` — an arrow it wrote carries no
            // `smooth` key at all — but the width is the one the brush is for.
            ...MDT_ARROW_DEFAULTS,
            size,
          })
        },
      }
    }
    if (tool === 'freehand') {
      return {
        mode: 'freehand' as const,
        onProgress: (points: Point[]) => {
          setProgress(points)
          publishDrawing?.(points)
        },
        onCommit: (points: Point[]) => {
          // Under two points there is no line, only a click that missed.
          if (points.length < 2) return
          actions.addObject({
            kind: 'stroke',
            points,
            sublevel: 1,
            color: colour,
            isArrow: false,
            ...MDT_STROKE_DEFAULTS,
            size,
          })
        },
      }
    }
    return undefined
  }, [tool, actions, publishDrawing, colour, size])

  // Leaving Route mode drops the active tool too, not merely the panel that shows it: `mode`
  // is a URL param, not a remount, so `tool` would otherwise survive the switch and keep
  // handing `drawing` to the map — landing a full-surface hit target over the codex tab's
  // blips, with nothing in that tab wired to give it a gesture.
  useEffect(() => {
    if (mode !== 'route') setTool(null)
  }, [mode])

  // Escape drops the active tool and the current selection, Delete removes the selected object,
  // and Ctrl/Cmd+Z undoes or redoes the last one. Only listens in Route mode: the codex tab
  // never has a tool, a selection or an object edit to act on.
  useEffect(() => {
    if (mode !== 'route') return
    const onKey = (e: KeyboardEvent) => {
      // A key pressed in a text field is text, not a command. Without this, Delete eats the
      // object whose text you are editing and Ctrl+Z fights the field's own undo.
      const target = e.target as HTMLElement | null
      const typing =
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'INPUT' ||
        target?.isContentEditable === true
      if (typing) return

      if (e.key === 'Escape') {
        setTool(null)
        setSelectedObject(null)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject) {
        e.preventDefault()
        actions.removeObject(selectedObject)
        setSelectedObject(null)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) actions.redo()
        else actions.undo()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode, selectedObject, actions])

  // A tool change starts with no preview, for this session and for every peer, and with no
  // selection either — both are state about the thing a *previous* tool was in the middle of.
  // Without clearing the selection here, switching away from Select leaves `selectedObject` set
  // with nothing on screen still showing it (the halo is gated on `tool === 'select'`), and
  // `Delete` would go on removing an object nothing looked selected. Placing a note selects it
  // for editing without changing `tool`, so that flow does not run through here and is untouched.
  //
  // Most gestures already publish their own clear on release or cancel, but dropping the tool
  // mid-drag (Escape, or leaving Route mode) unmounts `DrawSurface` without either firing —
  // locally that just leaves a stale, now-orphaned gesture to flash as the next tool's preview,
  // but over the wire it is worse: with nothing else left to publish the clear, the last
  // non-empty stroke stays on awareness indefinitely, and every teammate keeps rendering the
  // abandoned half-stroke until this session starts a whole new gesture.
  //
  // Keyed on `tool` alone, not `[tool, publishDrawing]`: `publishDrawing` changes identity on
  // every session status flip (see its own definition above), and a session opening or closing
  // mid-edit is not a tool change — it must not wipe a selection nobody asked to drop. Reading
  // it through `publishDrawingRef` is what lets this effect skip that dependency while still
  // reaching whichever `publishDrawing` is current at the moment the tool actually changes.
  useEffect(() => {
    setProgress([])
    publishDrawingRef.current?.([])
    setSelectedObject(null)
  }, [tool])

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

  /**
   * A pull's briefing names its mobs; hovering one puts its entry in the column, so the pack
   * can be read without hunting for its blips. `cursorNpc` stays untouched on purpose — it
   * exists only to tell whether the map's tooltip would repeat the column, and a cursor in the
   * right-hand panel is over no blip at all.
   */
  const handleHoverMob = useCallback(
    (id: number) => {
      if (frozenNpc == null) setPanelNpc(id)
    },
    [frozenNpc],
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
              colour={colour}
              size={size}
              onColour={setColour}
              onSize={setSize}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={actions.undo}
              onRedo={actions.redo}
            />
            {/* Weighing a pack and marking the map are different tasks; 360px shared between
                them would serve neither. What decides is whether there is an object to edit, not
                whether a tool is up: with a tool up and nothing selected the editor has only a
                hint to show, and trading a whole mob card for a sentence takes the codex away
                from someone whose hand is on the pencil but whose eye is still on the pack. */}
            {editing == null ? (
              <MobPanel
                slug={slug}
                dungeon={lookup.dungeon}
                enemy={panelEnemy}
                frozen={frozenNpc != null}
                onUnfreeze={() => setFrozenNpc(null)}
              />
            ) : (
              <ObjectEditor
                object={editing}
                onChange={(o) => o.id && actions.updateObject(o.id, o)}
                onDelete={() => {
                  if (editing?.id) actions.removeObject(editing.id)
                  setSelectedObject(null)
                }}
              />
            )}
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
            selectedObjectId={tool === 'select' ? selectedObject : null}
            onSelectObject={tool === 'select' || tool === 'erase' ? handleObjectClick : undefined}
            onMoveObject={
              tool === 'select'
                ? (id: string, at: Point) => {
                    const object = route.objects.find((o) => o.id === id)
                    if (object?.kind === 'note') actions.updateObject(id, { ...object, at })
                  }
                : undefined
            }
            drawing={drawing}
            previewStroke={
              progress.length > 1
                ? {
                    kind: 'stroke',
                    points: progress,
                    sublevel: 1,
                    color: colour,
                    isArrow: tool === 'arrow',
                    ...(tool === 'arrow' ? MDT_ARROW_DEFAULTS : MDT_STROKE_DEFAULTS),
                    size,
                  }
                : null
            }
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
              onHoverMob={handleHoverMob}
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
