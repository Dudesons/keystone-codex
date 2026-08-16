import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CloneRef, Enemy, Pack } from '../../lib/types'
import { cloneKey, mapUrl, portraitUrl, type DungeonLookup } from '../../lib/data'
import { getIndicators } from '../../lib/indicators'
import { MAP_HEIGHT, MAP_WIDTH, roundedPolygonPath, toPixels, type Point } from '../../lib/geometry'

const MIN_SCALE = 0.4
const MAX_SCALE = 6

export interface PullMark {
  pullIdx: number
  color: string
}

export interface PullShape {
  index: number
  color: string
  hull: Point[]
  center: Point
  count: number
}

interface Props {
  slug: string
  lookup: DungeonLookup
  highlighted?: ReadonlySet<string>
  pullMarks?: ReadonlyMap<string, PullMark>
  /** Enveloppes par pull, tracées en mode route à la façon de MDT. */
  pullShapes?: PullShape[]
  hoveredPull?: number | null
  selectedPack?: number | null
  onCloneClick?: (ref: CloneRef, additive: boolean) => void
  onPullClick?: (index: number) => void
  showPackOutlines?: boolean
}

interface Transform {
  scale: number
  tx: number
  ty: number
}

export default function DungeonMap({
  slug,
  lookup,
  highlighted,
  pullMarks,
  pullShapes,
  hoveredPull,
  selectedPack,
  onCloneClick,
  onPullClick,
  showPackOutlines = true,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 0.5, tx: 0, ty: 0 })
  const [panning, setPanning] = useState(false)
  const [hoverPack, setHoverPack] = useState<number | null>(null)
  const [hoverClone, setHoverClone] = useState<string | null>(null)
  const [showLegend, setShowLegend] = useState(false)

  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)

  const fit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const scale = Math.min(el.clientWidth / MAP_WIDTH, el.clientHeight / MAP_HEIGHT)
    setTransform({
      scale,
      tx: (el.clientWidth - MAP_WIDTH * scale) / 2,
      ty: (el.clientHeight - MAP_HEIGHT * scale) / 2,
    })
  }, [])

  useLayoutEffect(fit, [fit, slug])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      setTransform((t) => {
        const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
        const k = next / t.scale
        return { scale: next, tx: px - (px - t.tx) * k, ty: py - (py - t.ty) * k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, tx: transform.tx, ty: transform.ty, moved: false }
    setPanning(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true
    if (d.moved) setTransform((t) => ({ ...t, tx: d.tx + dx, ty: d.ty + dy }))
  }

  const endDrag = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    drag.current = null
    setPanning(false)
  }

  const handleCloneClick = (ref: CloneRef, e: React.MouseEvent) => {
    if (drag.current?.moved) return
    e.stopPropagation()
    onCloneClick?.(ref, e.ctrlKey || e.metaKey)
  }

  const dimOthers = (highlighted?.size ?? 0) > 0

  return (
    <div
      ref={containerRef}
      className="map-surface relative h-full w-full overflow-hidden bg-ink-950"
      data-panning={panning}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
        }}
      >
        <img
          src={mapUrl(slug)}
          alt=""
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          draggable={false}
          className="absolute inset-0 select-none"
        />

        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className="absolute inset-0"
        >
          <defs>
            {/* Un seul masque, exprimé en coordonnées relatives : il s'adapte à la taille
                de chaque portrait sans qu'on ait à en déclarer un par blip. */}
            <clipPath id="blip-clip" clipPathUnits="objectBoundingBox">
              <circle cx="0.5" cy="0.5" r="0.5" />
            </clipPath>
          </defs>

          {showPackOutlines &&
            [...lookup.packs.values()].map((pack) => (
              <PackOutline
                key={`hull-${pack.g}`}
                pack={pack}
                active={selectedPack === pack.g}
                hovered={hoverPack === pack.g}
              />
            ))}

          {/* Enveloppes de pull : c'est la lecture d'itinéraire de MDT. */}
          {pullShapes?.map((shape) => (
            <g key={`pull-${shape.index}`} onClick={() => onPullClick?.(shape.index)} style={{ cursor: 'pointer' }}>
              <path
                d={roundedPolygonPath(shape.hull)}
                fill={shape.color}
                fillOpacity={hoveredPull === shape.index ? 0.22 : 0.1}
                stroke={shape.color}
                strokeWidth={hoveredPull === shape.index ? 6 : 3.5}
                strokeLinejoin="round"
              />
            </g>
          ))}

          {lookup.dungeon.enemies.flatMap((enemy) =>
            enemy.clones
              .filter((c) => c.patrol?.length)
              .map((clone) => (
                <polyline
                  key={`patrol-${enemy.mdtIdx}-${clone.mdtIdx}`}
                  points={[{ x: clone.x, y: clone.y }, ...clone.patrol!]
                    .map((p) => toPixels(p.x, p.y))
                    .map((p) => `${p.x},${p.y}`)
                    .join(' ')}
                  fill="none"
                  stroke="rgba(74,144,194,0.55)"
                  strokeWidth={3}
                  strokeDasharray="10 8"
                  className="pointer-events-none"
                />
              )),
          )}

          {lookup.dungeon.enemies.flatMap((enemy) =>
            enemy.clones.map((clone) => {
              const key = cloneKey(enemy.mdtIdx, clone.mdtIdx)
              return (
                <Blip
                  key={key}
                  slug={slug}
                  enemy={enemy}
                  x={toPixels(clone.x, clone.y).x}
                  y={toPixels(clone.x, clone.y).y}
                  mark={pullMarks?.get(key)}
                  isHighlighted={highlighted?.has(key) ?? false}
                  isHovered={hoverClone === key}
                  dimmed={dimOthers && !highlighted?.has(key)}
                  inActivePack={clone.g != null && (clone.g === hoverPack || clone.g === selectedPack)}
                  onEnter={() => {
                    setHoverClone(key)
                    setHoverPack(clone.g)
                  }}
                  onLeave={() => {
                    setHoverClone(null)
                    setHoverPack(null)
                  }}
                  onClick={(e) => handleCloneClick({ enemyIdx: enemy.mdtIdx, cloneIdx: clone.mdtIdx }, e)}
                />
              )
            }),
          )}

          {/* Numéros de pull au centre de leur enveloppe, comme dans MDT. */}
          {pullShapes?.map((shape) => (
            <g key={`num-${shape.index}`} className="pointer-events-none">
              <circle cx={shape.center.x} cy={shape.center.y} r={22} fill="#0b0d12" fillOpacity={0.85} stroke={shape.color} strokeWidth={3} />
              <text
                x={shape.center.x}
                y={shape.center.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={24}
                fontWeight={700}
                fill={shape.color}
              >
                {shape.index + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <MapHud
        transform={transform}
        onFit={fit}
        legendOpen={showLegend}
        onToggleLegend={() => setShowLegend((v) => !v)}
        onZoom={(dir) =>
          setTransform((t) => {
            const el = containerRef.current
            if (!el) return t
            const px = el.clientWidth / 2
            const py = el.clientHeight / 2
            const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * (dir > 0 ? 1.25 : 1 / 1.25)))
            const k = next / t.scale
            return { scale: next, tx: px - (px - t.tx) * k, ty: py - (py - t.ty) * k }
          })
        }
      />

      {showLegend && <Legend />}
      {hoverClone && <CloneTooltip slug={slug} lookup={lookup} cloneKeyStr={hoverClone} />}
    </div>
  )
}

function PackOutline({ pack, active, hovered }: { pack: Pack; active: boolean; hovered: boolean }) {
  return (
    <path
      d={roundedPolygonPath(pack.hull)}
      fill={active ? 'rgba(224,181,82,0.16)' : hovered ? 'rgba(224,181,82,0.10)' : 'rgba(0,0,0,0.14)'}
      stroke={active ? '#e0b552' : hovered ? 'rgba(224,181,82,0.75)' : 'rgba(20,24,34,0.45)'}
      strokeWidth={active ? 4 : 2.5}
      strokeLinejoin="round"
      className="pointer-events-none"
    />
  )
}

interface BlipProps {
  slug: string
  enemy: Enemy
  x: number
  y: number
  mark?: PullMark
  isHighlighted: boolean
  isHovered: boolean
  dimmed: boolean
  inActivePack: boolean
  onEnter: () => void
  onLeave: () => void
  onClick: (e: React.MouseEvent) => void
}

function Blip({
  slug,
  enemy,
  x,
  y,
  mark,
  isHighlighted,
  isHovered,
  dimmed,
  inActivePack,
  onEnter,
  onLeave,
  onClick,
}: BlipProps) {
  const ind = getIndicators(slug, enemy)
  const r = (enemy.isBoss ? 22 : 14) * Math.min(enemy.scale || 1, 1.9)
  const emphasised = isHighlighted || isHovered

  // Pastilles d'indicateurs, disposées en arc au-dessus du portrait.
  const badges: { color: string; glyph: string; title: string }[] = []
  if (ind.kick) badges.push({ color: '#d64550', glyph: 'K', title: 'À interrompre' })
  if (ind.tankBuster) badges.push({ color: '#4a90c2', glyph: 'T', title: 'Tank buster' })
  if (ind.dispel.length) badges.push({ color: '#7f6fd0', glyph: 'D', title: 'Dispel' })

  return (
    <g
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      opacity={dimmed ? 0.28 : 1}
    >
      {emphasised && (
        <circle cx={x} cy={y} r={r + 12} fill="#e0b552" fillOpacity={0.18} stroke="#e0b552" strokeWidth={4} />
      )}
      {ind.priority && !mark && (
        <circle cx={x} cy={y} r={r + 4.5} fill="none" stroke={ind.ring} strokeWidth={2} strokeOpacity={0.55} />
      )}

      <circle cx={x} cy={y} r={r} fill="#12161f" />
      {enemy.displayId && (
        <image
          href={portraitUrl(enemy.displayId)}
          x={x - r}
          y={y - r}
          width={r * 2}
          height={r * 2}
          clipPath="url(#blip-clip)"
          preserveAspectRatio="xMidYMid slice"
        />
      )}

      {/* En mode route, la couleur du pull prime : c'est l'information qu'on lit d'abord. */}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={mark ? mark.color : 'none'}
        fillOpacity={mark ? 0.55 : 0}
        stroke={mark ? mark.color : emphasised || inActivePack ? '#e0b552' : ind.ring}
        strokeWidth={enemy.isBoss ? 4 : 3}
      />

      {mark && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={r * 1.2}
          fontWeight={700}
          fill="#0b0d12"
          className="pointer-events-none"
          style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.6)', strokeWidth: 3 }}
        >
          {mark.pullIdx + 1}
        </text>
      )}

      {badges.map((badge, i) => {
        // Arc de -50° à +50° au-dessus du blip, centré quel que soit le nombre de pastilles.
        const spread = 46
        const angle = (-90 + (i - (badges.length - 1) / 2) * spread) * (Math.PI / 180)
        const bx = x + Math.cos(angle) * (r + 5)
        const by = y + Math.sin(angle) * (r + 5)
        const br = Math.max(6, r * 0.42)
        return (
          <g key={badge.glyph} className="pointer-events-none">
            <title>{badge.title}</title>
            <circle cx={bx} cy={by} r={br} fill={badge.color} stroke="#0b0d12" strokeWidth={1.5} />
            <text
              x={bx}
              y={by}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={br * 1.3}
              fontWeight={700}
              fill="#0b0d12"
            >
              {badge.glyph}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function MapHud({
  transform,
  onFit,
  onZoom,
  legendOpen,
  onToggleLegend,
}: {
  transform: Transform
  onFit: () => void
  onZoom: (dir: number) => void
  legendOpen: boolean
  onToggleLegend: () => void
}) {
  const btn =
    'h-8 w-8 rounded border border-ink-700 bg-ink-900/90 text-ink-300 hover:text-gold-400 hover:border-gold-500 transition'
  return (
    <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
      <span className="mr-1 rounded bg-ink-900/90 px-2 py-1 text-xs text-ink-400 tabular-nums">
        {Math.round(transform.scale * 100)}%
      </span>
      <button
        className={`${btn} w-auto px-2 text-xs ${legendOpen ? 'border-gold-500 text-gold-400' : ''}`}
        onClick={onToggleLegend}
      >
        Légende
      </button>
      <button className={btn} onClick={() => onZoom(-1)} title="Dézoomer">
        −
      </button>
      <button className={btn} onClick={() => onZoom(1)} title="Zoomer">
        +
      </button>
      <button className={`${btn} w-auto px-2 text-xs`} onClick={onFit} title="Recadrer">
        Recadrer
      </button>
    </div>
  )
}

function Legend() {
  const rows: [string, string, string][] = [
    ['#d64550', 'K', 'Sort à interrompre (source MDT)'],
    ['#4a90c2', 'T', 'Tank buster (déclaré dans la fiche)'],
    ['#7f6fd0', 'D', 'Sort dissipable (source MDT)'],
  ]
  const ringRows: [string, string][] = [
    ['#cf3f52', 'Menace létale'],
    ['#d97036', 'Dangereux'],
    ['#c9992f', 'À surveiller'],
    ['#5b8f6a', 'Sans danger'],
    ['#e0b552', 'Boss'],
    ['rgba(180,190,210,0.75)', 'Menace non renseignée'],
  ]
  return (
    <div className="absolute top-3 right-3 w-60 rounded border border-ink-700 bg-ink-900/95 p-3 text-xs shadow-lg">
      <div className="mb-1.5 text-[10px] font-bold tracking-widest text-ink-400">PASTILLES</div>
      {rows.map(([color, glyph, label]) => (
        <div key={glyph} className="mb-1 flex items-center gap-2">
          <span
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-ink-950"
            style={{ background: color }}
          >
            {glyph}
          </span>
          <span className="text-ink-300">{label}</span>
        </div>
      ))}
      <div className="mt-2.5 mb-1.5 text-[10px] font-bold tracking-widest text-ink-400">ANNEAU</div>
      {ringRows.map(([color, label]) => (
        <div key={label} className="mb-1 flex items-center gap-2">
          <span
            className="h-4 w-4 shrink-0 rounded-full border-[3px] bg-ink-850"
            style={{ borderColor: color }}
          />
          <span className="text-ink-300">{label}</span>
        </div>
      ))}
    </div>
  )
}

function CloneTooltip({
  slug,
  lookup,
  cloneKeyStr,
}: {
  slug: string
  lookup: DungeonLookup
  cloneKeyStr: string
}) {
  const entry = lookup.cloneByKey.get(cloneKeyStr)
  if (!entry) return null
  const { enemy, clone } = entry
  const pack = clone.g != null ? lookup.packs.get(clone.g) : null
  const ind = getIndicators(slug, enemy)

  return (
    <div className="pointer-events-none absolute top-3 left-3 max-w-72 rounded border border-ink-700 bg-ink-900/95 px-3 py-2 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-ink-100">{enemy.name}</span>
        {enemy.isBoss && <span className="text-xs text-gold-400">boss</span>}
      </div>
      <div className="mt-0.5 text-xs text-ink-400">
        {enemy.count > 0 ? `${enemy.count} forces` : 'aucune force'}
        {pack && ` · pack ${pack.g} (${pack.count})`}
        {clone.patrol?.length ? ' · patrouille' : ''}
      </div>
      {(ind.kick || ind.tankBuster || ind.dispel.length) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {ind.kick && <Chip color="#d64550">à kick</Chip>}
          {ind.tankBuster && <Chip color="#4a90c2">tank buster</Chip>}
          {ind.dispel.map((d) => (
            <Chip key={d} color="#7f6fd0">
              {d}
            </Chip>
          ))}
        </div>
      )}
      {ind.hasTrap && <div className="mt-1 text-xs text-threat-lethal">⚠ piège documenté</div>}
    </div>
  )
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="rounded border px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ color, borderColor: `${color}66`, background: `${color}1a` }}
    >
      {children}
    </span>
  )
}
