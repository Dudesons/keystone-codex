import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DungeonMap, { type PullMark, type PullShape } from '../components/map/DungeonMap'
import CodexPanel, { type PullRef } from '../components/codex/CodexPanel'
import RoutePanel from '../components/route/RoutePanel'
import { cloneKey, getLookup } from '../lib/data'
import { getDungeonContent } from '../lib/content'
import { toCssColor } from '../lib/mdt/route'
import { useRouteDoc } from '../lib/mdt/useRouteDoc'
import { convexHull, expandPolygon, toPixels } from '../lib/geometry'
import type { CloneRef } from '../lib/types'

type Mode = 'codex' | 'route'

export default function DungeonPage() {
  const { slug = '', npcId } = useParams()
  const lookup = getLookup(slug)

  if (!lookup) {
    return (
      <div className="p-8">
        <p className="text-ink-300">Donjon inconnu.</p>
        <Link to="/" className="text-gold-400 hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  // La clé force un remontage complet au changement de donjon : le document de route et les
  // sélections repartent de zéro, sans état résiduel d'un donjon sur l'autre.
  return <DungeonView key={slug} slug={slug} npcId={npcId} />
}

function DungeonView({ slug, npcId }: { slug: string; npcId?: string }) {
  const navigate = useNavigate()
  const lookup = getLookup(slug)!

  const [mode, setMode] = useState<Mode>('codex')
  const [selectedPack, setSelectedPack] = useState<number | null>(null)
  const [hoveredNpc, setHoveredNpc] = useState<number | null>(null)
  const [focusNpc, setFocusNpc] = useState<number | null>(null)
  const [currentPull, setCurrentPull] = useState(0)
  const [hoveredPull, setHoveredPull] = useState<number | null>(null)

  const { route, actions, collab, joinRoom, leaveRoom } = useRouteDoc(slug, lookup.dungeon.mdtIndex)

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

  /** Enveloppe autour des clones de chaque pull — la lecture d'itinéraire de MDT. */
  const pullShapes = useMemo<PullShape[]>(() => {
    if (mode !== 'route') return []
    return route.pulls.flatMap((pull, index) => {
      const points = pull.clones
        .map((ref) => lookup.cloneByKey.get(cloneKey(ref.enemyIdx, ref.cloneIdx)))
        .filter((e) => e != null)
        .map((e) => toPixels(e!.clone.x, e!.clone.y))
      if (!points.length) return []

      const hull = expandPolygon(convexHull(points), 34)
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

  /** Pull auquel appartient chaque mob : c'est ce qui relie le codex à la route. */
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

    // Survoler un pull dans la liste éclaire ses mobs sur la carte, et inversement.
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
        // Le panneau défile jusqu'à l'unité cliquée plutôt que de la laisser chercher.
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

  const content = getDungeonContent(slug)
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
      <header className="flex shrink-0 items-center gap-4 border-b border-ink-800 px-4 py-2.5">
        <Link to="/" className="text-sm text-ink-400 hover:text-gold-400">
          ←
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-semibold text-ink-100">{lookup.dungeon.englishName}</h1>
          <p className="text-[11px] text-ink-400">
            {lookup.dungeon.totalCount} forces · {lookup.packs.size} packs
            {content?.timer ? ` · ${content.timer} min` : ''}
            {hasRoute && ` · route « ${route.name} »`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {collab.status !== 'off' && (
            <span className="rounded border border-threat-low/40 bg-threat-low/10 px-2 py-1 text-[11px] text-threat-low">
              {collab.room} · {collab.peers}
            </span>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-ink-800 bg-ink-900 p-0.5">
            {tab('codex', 'Codex')}
            {tab('route', 'Route')}
          </div>
        </div>
      </header>

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
            showPackOutlines={mode === 'codex'}
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
              onLeaveRoom={leaveRoom}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
