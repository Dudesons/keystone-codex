// ABOUTME: The interactive map: pan and zoom, mob blips, pack and pull outlines, legend.
// ABOUTME: Rendering only; the pan, zoom and layout arithmetic lives in viewport.ts.

import type { ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CloneRef, Enemy, Pack } from '../../lib/types'
import { cloneKey, mapUrl, portraitUrl, type DungeonLookup } from '../../lib/data'
import { getIndicators } from '../../lib/indicators'
import { useI18n } from '../../lib/i18n/context'
import { MAP_HEIGHT, MAP_WIDTH, roundedPolygonPath, toPixels, type Point } from '../../lib/geometry'
import type { Peer } from '../../lib/collab/presence'
import type { MdtNote, MdtObject, MdtStroke } from '../../lib/mdt/objects'
import MobStats from '../codex/MobStats'
import NoteLayer from './NoteLayer'
import ObjectLayer from './ObjectLayer'
import PeerCursors from './PeerCursors'
import PoiLayer, { PoiTooltip } from './PoiLayer'
import {
  BUTTON_STEP,
  WHEEL_STEP,
  badgeArc,
  blipRadius,
  fitTransform,
  toMapPoint,
  zoomAt,
  type Transform,
} from './viewport'

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
  /** Per-pull outlines, drawn in route mode the way MDT does. */
  pullShapes?: PullShape[]
  hoveredPull?: number | null
  selectedPack?: number | null
  onCloneClick?: (ref: CloneRef, additive: boolean) => void
  onPullClick?: (index: number) => void
  showPackOutlines?: boolean
  onCursorMove?: (p: Point | null) => void
  cursors?: Peer[]
  notice?: ReactNode
  /** The preset's notes and strokes. Route mode only: they belong to an itinerary. */
  objects?: MdtObject[]
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
  onCursorMove,
  cursors,
  notice,
  objects,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 0.5, tx: 0, ty: 0 })
  const [panning, setPanning] = useState(false)
  const [hoverPack, setHoverPack] = useState<number | null>(null)
  const [hoverClone, setHoverClone] = useState<string | null>(null)
  const [hoverPoi, setHoverPoi] = useState<number | null>(null)
  const [showLegend, setShowLegend] = useState(false)

  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)

  const fit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setTransform(fitTransform({ width: el.clientWidth, height: el.clientHeight }))
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
      const pivot = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP
      setTransform((t) => zoomAt(t, factor, pivot))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, tx: transform.tx, ty: transform.ty, moved: false }
    setPanning(true)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    // `getBoundingClientRect` forces the browser to flush layout — worth skipping on this,
    // the hottest path there is, when nobody has asked for the cursor at all.
    if (onCursorMove) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      onCursorMove(toMapPoint(transform, { x: e.clientX - rect.left, y: e.clientY - rect.top }))
    }

    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved && Math.hypot(dx, dy) > 4) {
      d.moved = true
      // Capture only from here on. A pointer captured at release redirects the click to the
      // capturing element, so capturing on press would aim every click at this container and
      // no blip would ever hear one. Once the press is a drag, that redirection is the point:
      // it keeps the pan alive outside the map, and stops it from landing as a click.
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }
    if (d.moved) setTransform((t) => ({ ...t, tx: d.tx + dx, ty: d.ty + dy }))
  }

  const endDrag = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    drag.current = null
    setPanning(false)
  }

  const onPointerCancel = (e: React.PointerEvent) => {
    endDrag(e)
    // A cancelled gesture (a touch interrupted by the browser, say) fires no `pointerleave`:
    // without this, a peer keeps seeing a parked arrow until the pointer happens to cross the
    // container edge some other way.
    onCursorMove?.(null)
  }

  const handleCloneClick = (ref: CloneRef, e: React.MouseEvent) => {
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
      onPointerCancel={onPointerCancel}
      onPointerLeave={() => onCursorMove?.(null)}
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
            {/* A single mask, in relative coordinates: it adapts to the size of every
                portrait without having to declare one per blip. */}
            <clipPath id="blip-clip" clipPathUnits="objectBoundingBox">
              <circle cx="0.5" cy="0.5" r="0.5" />
            </clipPath>
          </defs>

          <PoiLayer pois={lookup.dungeon.pois} onHover={setHoverPoi} />

          {showPackOutlines &&
            [...lookup.packs.values()].map((pack) => (
              <PackOutline
                key={`hull-${pack.g}`}
                pack={pack}
                active={selectedPack === pack.g}
                hovered={hoverPack === pack.g}
              />
            ))}

          {/* Pull outlines: this is how MDT reads as an itinerary. */}
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

          {/* The preset's own drawings: over the route's outline, under the mobs. */}
          {objects && <ObjectLayer strokes={objects.filter((o): o is MdtStroke => o.kind === 'stroke')} />}

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
                  cloneId={key}
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

          {/* Pull numbers at the centre of their outline, as in MDT. */}
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
            // The buttons zoom on the middle of the view, where the wheel zooms on the cursor.
            const pivot = { x: el.clientWidth / 2, y: el.clientHeight / 2 }
            return zoomAt(t, dir > 0 ? BUTTON_STEP : 1 / BUTTON_STEP, pivot)
          })
        }
      />

      {showLegend && <Legend />}
      {hoverClone && <CloneTooltip slug={slug} lookup={lookup} cloneKeyStr={hoverClone} />}
      {hoverClone == null && hoverPoi != null && lookup.dungeon.pois[hoverPoi] && (
        <PoiTooltip poi={lookup.dungeon.pois[hoverPoi]} />
      )}
      {cursors && <PeerCursors peers={cursors} transform={transform} />}
      {/* An explicit predicate, not a bare `o.kind === 'note'`: once Task 6 puts a second
          member in the union, `filter` alone hands back `MdtObject[]`. */}
      {objects && (
        <NoteLayer
          notes={objects.filter((o): o is MdtNote => o.kind === 'note')}
          transform={transform}
        />
      )}
      {notice}
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
  cloneId: string
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
  cloneId,
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
  const { t, locale } = useI18n()
  const ind = getIndicators(slug, enemy, locale)
  const r = blipRadius(enemy)
  const emphasised = isHighlighted || isHovered

  // Indicator pips, laid out in an arc above the portrait.
  const badges: { color: string; glyph: string; title: string }[] = []
  if (ind.kick) badges.push({ color: '#d64550', glyph: 'K', title: t('map.badgeKick') })
  if (ind.frontalSpells.length)
    badges.push({ color: '#cf6fa0', glyph: 'F', title: t('map.badgeFrontal') })
  if (ind.tankBuster) badges.push({ color: '#4a90c2', glyph: 'T', title: t('map.badgeTank') })
  if (ind.dispel.length) badges.push({ color: '#7f6fd0', glyph: 'D', title: t('map.badgeDispel') })
  const placements = badgeArc(badges.length, { x, y }, r)

  return (
    <g
      data-clone={cloneId}
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

      {/* In route mode the pull colour wins: it is what you read first. */}
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
        const { x: bx, y: by, r: br } = placements[i]
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
  const { t, formatPercent } = useI18n()
  const btn =
    'h-8 w-8 rounded border border-ink-700 bg-ink-900/90 text-ink-300 hover:text-gold-400 hover:border-gold-500 transition'
  return (
    <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
      <span className="mr-1 rounded bg-ink-900/90 px-2 py-1 text-xs text-ink-400 tabular-nums">
        {formatPercent(transform.scale * 100)}
      </span>
      <button
        className={`${btn} w-auto px-2 text-xs ${legendOpen ? 'border-gold-500 text-gold-400' : ''}`}
        onClick={onToggleLegend}
      >
        {t('map.legend')}
      </button>
      <button className={btn} onClick={() => onZoom(-1)} title={t('map.zoomOut')}>
        −
      </button>
      <button className={btn} onClick={() => onZoom(1)} title={t('map.zoomIn')}>
        +
      </button>
      <button className={`${btn} w-auto px-2 text-xs`} onClick={onFit} title={t('map.fit')}>
        {t('map.fit')}
      </button>
    </div>
  )
}

function Legend() {
  const { t } = useI18n()
  const rows: [string, string, string][] = [
    ['#d64550', 'K', t('legend.kick')],
    ['#cf6fa0', 'F', t('legend.frontal')],
    ['#4a90c2', 'T', t('legend.tank')],
    ['#7f6fd0', 'D', t('legend.dispel')],
  ]
  const ringRows: [string, string][] = [
    ['#cf3f52', t('legend.ring.lethal')],
    ['#d97036', t('legend.ring.high')],
    ['#c9992f', t('legend.ring.medium')],
    ['#5b8f6a', t('legend.ring.low')],
    ['#e0b552', t('legend.ring.boss')],
    ['rgba(180,190,210,0.75)', t('legend.ring.unknown')],
  ]
  return (
    <div className="absolute top-3 right-3 w-60 rounded border border-ink-700 bg-ink-900/95 p-3 text-xs shadow-lg">
      <div className="mb-1.5 text-[10px] font-bold tracking-widest text-ink-400">{t('legend.pips')}</div>
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
      <div className="mt-2.5 mb-1.5 text-[10px] font-bold tracking-widest text-ink-400">
        {t('legend.ring')}
      </div>
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
  const { t, locale } = useI18n()
  const entry = lookup.cloneByKey.get(cloneKeyStr)
  if (!entry) return null
  const { enemy, clone } = entry
  const pack = clone.g != null ? lookup.packs.get(clone.g) : null
  const ind = getIndicators(slug, enemy, locale)
  // Either fragment can be absent on its own (a loner outside any patrol, or a patrol member
  // with no pack), so the separator only belongs between two fragments that both exist.
  const meta = [
    pack ? t('map.pack', { g: pack.g, n: pack.count }) : null,
    clone.patrol?.length ? t('map.patrol') : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="pointer-events-none absolute top-3 left-3 max-w-72 rounded border border-ink-700 bg-ink-900/95 px-3 py-2 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-ink-100">{enemy.name}</span>
        {enemy.isBoss && <span className="text-xs text-gold-400">{t('map.boss')}</span>}
      </div>
      <MobStats enemy={enemy} dungeon={lookup.dungeon} />
      {meta && <div className="mt-0.5 text-xs text-ink-400">{meta}</div>}
      {(ind.kick || ind.tankBuster || ind.dispel.length) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {ind.kick && <Chip color="#d64550">{t('map.toKick')}</Chip>}
          {ind.tankBuster && <Chip color="#4a90c2">{t('map.tankBuster')}</Chip>}
          {ind.dispel.map((d) => (
            <Chip key={d} color="#7f6fd0">
              {d}
            </Chip>
          ))}
        </div>
      )}
      {ind.hasTrap && (
        <div className="mt-1 text-xs text-threat-lethal">⚠ {t('map.trapDocumented')}</div>
      )}
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
