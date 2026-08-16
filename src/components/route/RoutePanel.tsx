import { useMemo, useState } from 'react'
import type { DungeonLookup } from '../../lib/data'
import { cloneKey } from '../../lib/data'
import { getMobContent } from '../../lib/content'
import { getIndicators, kickList } from '../../lib/indicators'
import { encodeMdtString } from '../../lib/mdt/string'
import { routeStats, routeToLua, toCssColor, type Route } from '../../lib/mdt/route'
import type { CollabState, RouteActions } from '../../lib/mdt/useRouteDoc'
import { randomRoomCode } from '../../lib/mdt/useRouteDoc'
import type { Enemy } from '../../lib/types'

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
}: Props) {
  const [importText, setImportText] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  const stats = routeStats(route, lookup)

  /** Mobs distincts d'un pull, avec leur nombre d'unités. */
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
          text: `Cette route est pour ${imported.slug.replace(/-/g, ' ')}, pas pour ce donjon.`,
        })
        return
      }
      onCurrentPullChange(Math.max(0, imported.pulls.length - 1))
      setImportText('')
      setMessage({ kind: 'ok', text: `« ${imported.name} » importée : ${imported.pulls.length} pulls.` })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
    }
  }

  const handleExport = async () => {
    try {
      await navigator.clipboard.writeText(encodeMdtString(routeToLua(route)))
      setMessage({ kind: 'ok', text: 'String MDT copiée. Colle-la dans MDT en jeu (Import).' })
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-ink-700 bg-ink-850 p-3">
        <input
          value={route.name}
          onChange={(e) => actions.setName(e.target.value)}
          className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-sm text-ink-100 focus:border-gold-500 focus:outline-none"
          placeholder="Nom de la route"
        />

        <div className="mt-3 flex items-baseline justify-between text-sm">
          <span className="text-ink-400">Forces</span>
          <span className="tabular-nums">
            <span className={stats.percent >= 100 ? 'text-threat-low' : 'text-ink-100'}>{stats.total}</span>
            <span className="text-ink-600"> / {stats.required}</span>
            <span className={`ml-2 ${stats.percent >= 100 ? 'text-threat-low' : 'text-gold-400'}`}>
              {stats.percent.toFixed(1)}%
            </span>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-800">
          <div
            className={`h-full rounded-full ${stats.percent >= 100 ? 'bg-threat-low' : 'bg-gold-500'}`}
            style={{ width: `${Math.min(100, stats.percent)}%` }}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 rounded border border-gold-500/60 bg-gold-500/10 px-2 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20"
          >
            Copier la string MDT
          </button>
          <button
            onClick={() => {
              actions.addPull()
              // On bascule sur le pull qu'on vient de créer, sinon le clic suivant sur la
              // carte irait alimenter l'ancien.
              onCurrentPullChange(route.pulls.length)
            }}
            className="rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400"
          >
            + Pull
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-bold tracking-widest text-ink-400">
          PULLS · {route.pulls.length}
        </h3>
        <ol className="space-y-1.5">
          {route.pulls.map((pull, i) => {
            const active = i === currentPull
            const forces = stats.cumulative[i] - (i > 0 ? stats.cumulative[i - 1] : 0)
            const mobs = pullMobs[i]
            const isOpen = expanded === i

            return (
              <li
                key={i}
                onClick={() => onCurrentPullChange(i)}
                onMouseEnter={() => onHoverPull(i)}
                onMouseLeave={() => onHoverPull(null)}
                className={`cursor-pointer rounded border transition ${
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
                      ? mobs.map((m) => `${m.n}× ${m.enemy.name}`).join(', ')
                      : 'vide — clique un pack sur la carte'}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-400 tabular-nums">
                    +{forces} · {((stats.cumulative[i] / stats.required) * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Briefing du pull : ce qu'il faut savoir avant de l'engager. */}
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
                    {isOpen ? '▾ Masquer' : '▸ Briefing'}
                  </button>
                  <span className="flex-1" />
                  <button
                    className="rounded px-1 text-ink-600 hover:text-gold-400"
                    onClick={(e) => (e.stopPropagation(), actions.movePull(i, -1), onCurrentPullChange(Math.max(0, i - 1)))}
                    title="Monter"
                  >
                    ▲
                  </button>
                  <button
                    className="rounded px-1 text-ink-600 hover:text-gold-400"
                    onClick={(e) => (e.stopPropagation(), actions.movePull(i, 1), onCurrentPullChange(Math.min(route.pulls.length - 1, i + 1)))}
                    title="Descendre"
                  >
                    ▼
                  </button>
                  <button
                    className="rounded px-1 text-ink-600 hover:text-threat-lethal"
                    onClick={(e) => (e.stopPropagation(), actions.removePull(i), onCurrentPullChange(Math.max(0, i - 1)))}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
        <p className="mt-2 text-[11px] text-ink-600">
          Clique un pack sur la carte pour l'ajouter au pull sélectionné. Ctrl+clic ne vise qu'un
          seul mob. Cliquer à nouveau retire.
        </p>
      </section>

      <CollabSection
        collab={collab}
        onJoinRoom={onJoinRoom}
        onLeaveRoom={onLeaveRoom}
        onMessage={setMessage}
      />

      <section className="rounded-lg border border-ink-700 bg-ink-850 p-3">
        <h3 className="mb-2 text-[10px] font-bold tracking-widest text-ink-400">IMPORTER</h3>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="Colle ici une string MDT (!~MDT2~… ou format legacy)"
          rows={3}
          className="thin-scroll w-full resize-none rounded border border-ink-700 bg-ink-900 px-2 py-1.5 font-mono text-[11px] text-ink-300 focus:border-gold-500 focus:outline-none"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="flex-1 rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400 disabled:opacity-40"
          >
            Importer
          </button>
          <button
            onClick={() => (actions.reset(), onCurrentPullChange(0))}
            className="rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-500 hover:border-threat-lethal hover:text-threat-lethal"
          >
            Vider
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
  const ind = getIndicators(slug, enemy)
  const kicks = kickList(slug, enemy)
  const trap = getMobContent(slug, enemy.id)?.trap

  return (
    <div
      className="mb-1.5 rounded px-1 py-0.5 last:mb-0 hover:bg-ink-800"
      onClick={(e) => (e.stopPropagation(), onClick())}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-ink-100">
          {n}× {enemy.name}
        </span>
        {ind.tankBuster && <span className="text-[9px] font-bold text-tag-tank">TANK</span>}
        {ind.priority && <span className="text-[9px] font-bold text-gold-400">PRIO</span>}
      </div>
      {kicks.length > 0 && (
        <div className="text-[11px] text-tag-kick">
          kick : {kicks.map((k) => k.name).join(', ')}
        </div>
      )}
      {trap && <div className="text-[11px] text-threat-lethal">⚠ {trap}</div>}
    </div>
  )
}

function CollabSection({
  collab,
  onJoinRoom,
  onLeaveRoom,
  onMessage,
}: {
  collab: CollabState
  onJoinRoom: (room: string, mode: 'host' | 'guest') => void
  onLeaveRoom: () => void
  onMessage: (m: { kind: 'ok' | 'error'; text: string }) => void
}) {
  const [code, setCode] = useState('')

  if (collab.status !== 'off') {
    return (
      <section className="rounded-lg border border-threat-low/40 bg-threat-low/5 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-threat-low">SESSION PARTAGÉE</div>
            <div className="mt-0.5 font-mono text-lg tracking-widest text-ink-100">{collab.room}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-ink-300">
              {collab.status === 'connected' ? `${collab.peers} connecté${collab.peers > 1 ? 's' : ''}` : 'connexion…'}
            </div>
            <div className="text-[10px] text-ink-500">{collab.identity}</div>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(collab.room ?? '')
              onMessage({ kind: 'ok', text: 'Code de session copié.' })
            }}
            className="flex-1 rounded border border-ink-700 px-2 py-1 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400"
          >
            Copier le code
          </button>
          <button
            onClick={onLeaveRoom}
            className="rounded border border-ink-700 px-2 py-1 text-xs text-ink-500 hover:border-threat-lethal hover:text-threat-lethal"
          >
            Quitter
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-ink-700 bg-ink-850 p-3">
      <h3 className="mb-2 text-[10px] font-bold tracking-widest text-ink-400">ÉDITER À PLUSIEURS</h3>
      <button
        onClick={() => onJoinRoom(randomRoomCode(), 'host')}
        className="w-full rounded border border-gold-500/60 bg-gold-500/10 px-2 py-1.5 text-xs font-semibold text-gold-400 hover:bg-gold-500/20"
      >
        Ouvrir une session avec cette route
      </button>
      <div className="mt-2 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CODE"
          maxLength={6}
          className="w-24 rounded border border-ink-700 bg-ink-900 px-2 py-1.5 text-center font-mono text-xs tracking-widest text-ink-100 focus:border-gold-500 focus:outline-none"
        />
        <button
          onClick={() => onJoinRoom(code.trim(), 'guest')}
          disabled={code.trim().length < 4}
          className="flex-1 rounded border border-ink-700 px-2 py-1.5 text-xs text-ink-300 hover:border-gold-500 hover:text-gold-400 disabled:opacity-40"
        >
          Rejoindre
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink-600">
        Pair-à-pair, sans serveur : la route est synchronisée en direct entre les navigateurs.
        Rejoindre remplace ta route locale par celle du salon.
      </p>
    </section>
  )
}
