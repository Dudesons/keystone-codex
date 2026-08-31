// ABOUTME: The interactive map: pan and zoom, mob blips, pack and pull outlines, legend.
// ABOUTME: Rendering only; the pan, zoom and layout arithmetic lives in viewport.ts.

import type { ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CloneRef, Enemy, Pack } from '../../lib/types'
import {
  cloneKey,
  getNpcLabel,
  mapUrl,
  mdtRelease,
  portraitUrl,
  type DungeonLookup,
} from '../../lib/data'
import { getIndicators, tippedPacks } from '../../lib/indicators'
import { useI18n } from '../../lib/i18n/context'
import { MAP_HEIGHT, MAP_WIDTH, roundedPolygonPath, toPixels, type Point } from '../../lib/geometry'
import type { Peer } from '../../lib/collab/presence'
import { MDT_STROKE_DEFAULTS, type MdtNote, type MdtObject, type MdtStroke } from '../../lib/mdt/objects'
import MobStats from '../codex/MobStats'
import DrawSurface from './DrawSurface'
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
  focusTransform,
  toMapPoint,
  zoomAt,
  type Transform,
} from './viewport'

/**
 * The fields a stroke needs to be drawable, for one that exists only while a hand is moving.
 * `color` is never actually painted: the one call site below always supplies `colorOverride`, a
 * peer's own colour rather than MDT's. It is here only because `MdtStroke` requires the field —
 * typed as `MdtStroke` rather than left to inference, so a future required field on that
 * interface surfaces here rather than as a mystery at the call site.
 */
const PREVIEW_STROKE: MdtStroke = {
  kind: 'stroke',
  points: [],
  sublevel: 1,
  color: 'ffffff',
  isArrow: false,
  ...MDT_STROKE_DEFAULTS,
}

export interface PullMark {
  color: string
}

export interface PullShape {
  index: number
  color: string
  hull: Point[]
  center: Point
  count: number
}

/**
 * Where the map should sit, and a token that changes every time the reader asks again.
 *
 * The token is what makes a second click on the same target work: the points would be equal, and
 * re-applying an effect that has not changed is not something React does. Same reasoning as
 * `flashToken` in `MobTips`.
 */
export interface MapFocus {
  points: Point[]
  token: string
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
  /** The mob under the cursor, or null when it leaves. Fires on every blip enter and leave. */
  onHoverClone?: (ref: CloneRef | null) => void
  /** Right-click on a mob. The map neither freezes nor knows what freezing means. */
  onCloneContextMenu?: (ref: CloneRef) => void
  onPullClick?: (index: number) => void
  showPackOutlines?: boolean
  onCursorMove?: (p: Point | null) => void
  cursors?: Peer[]
  notice?: ReactNode
  /** The preset's notes and strokes. Route mode only: they belong to an itinerary. */
  objects?: MdtObject[]
  /** The local stroke in progress, drawn with the same layer the committed ones use. */
  previewStroke?: MdtStroke | null
  /** Hide the hover tooltip: something else on the page is already showing the hovered mob. */
  suppressCloneTooltip?: boolean
  /** The object the page is editing, so the layers can mark it. */
  selectedObjectId?: string | null
  /** Clicking an object. Supplied only while something can select one — see the note on hit targets. */
  onSelectObject?: (id: string) => void
  /** Dragging an object to a new position, in map pixels. */
  onMoveObject?: (id: string, at: Point) => void
  /** The gesture a tool wants, or absent when the map is just a map. */
  drawing?: {
    mode: 'point' | 'line' | 'freehand'
    onProgress?: (points: Point[]) => void
    onCommit: (points: Point[]) => void
  }
  /** Bring these map-pixel points into view instead of fitting the whole map. */
  focus?: MapFocus | null
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
  onHoverClone,
  onCloneContextMenu,
  onPullClick,
  showPackOutlines = true,
  onCursorMove,
  cursors,
  notice,
  objects,
  previewStroke,
  suppressCloneTooltip,
  selectedObjectId,
  onSelectObject,
  onMoveObject,
  drawing,
  focus,
}: Props) {
  const { locale } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<Transform>({ scale: 0.5, tx: 0, ty: 0 })
  const [panning, setPanning] = useState(false)
  const [hoverPack, setHoverPack] = useState<number | null>(null)
  const [hoverClone, setHoverClone] = useState<string | null>(null)
  const [hoverPoi, setHoverPoi] = useState<number | null>(null)
  /**
   * Open from the start: a pip's letter and a ring's colour are what a reader needs *before* they
   * would know to go looking for the key to them, so the map explains itself rather than waiting
   * to be asked. The button stays, because someone who has learnt the code wants the map bare.
   *
   * It sits top-right, which nothing else claims — both tooltips and the relay notice sit along
   * the top-left and centre, and the zoom cluster along the bottom-right.
   */
  const [showLegend, setShowLegend] = useState(true)
  /**
   * Pip kinds the reader has switched off from the legend.
   *
   * Deliberately not persisted and not shared with a session: it is a view preference, and a
   * peer hiding your pips mid-pull would be a surprise rather than a feature. A reader who hides
   * one and forgets gets the whole map back on reload, which is the failure worth having.
   */
  const [hiddenPips, setHiddenPips] = useState<ReadonlySet<string>>(() => new Set())
  const togglePip = useCallback(
    (name: string) =>
      setHiddenPips((current) => {
        const next = new Set(current)
        if (!next.delete(name)) next.add(name)
        return next
      }),
    [],
  )

  /** The pulls something is written about. Keyed by locale: a translation replaces the tips. */
  const tipPulls = useMemo(
    () => tippedPacks(slug, lookup.dungeon.enemies, locale),
    [slug, lookup, locale],
  )

  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)

  /**
   * Read through a ref rather than closed over, so `fit` keeps one identity for the life of the
   * component. The `ResizeObserver` effect below depends on `fit`; a `fit` that changed on every
   * render of the parent would tear that observer down and rebuild it constantly, and refit the
   * map out from under a reader mid-pan.
   */
  const focusRef = useRef(focus)
  focusRef.current = focus

  const fit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const size = { width: el.clientWidth, height: el.clientHeight }
    const wanted = focusRef.current
    setTransform(wanted?.points.length ? focusTransform(wanted.points, size) : fitTransform(size))
  }, [])

  useLayoutEffect(fit, [fit, slug, focus?.token])

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
      data-map-viewport
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={onPointerCancel}
      onPointerLeave={() => onCursorMove?.(null)}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        data-map-canvas
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
            <g
              key={`pull-${shape.index}`}
              data-pull={shape.index}
              onClick={() => onPullClick?.(shape.index)}
              style={{ cursor: 'pointer' }}
            >
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
          {objects && (
            <ObjectLayer
              strokes={objects.filter((o): o is MdtStroke => o.kind === 'stroke')}
              selectedId={selectedObjectId}
              onSelect={onSelectObject}
            />
          )}

          {/* The local gesture in progress, at the same depth as a finished stroke. Its own
              `data-testid` prefix, so it can never be counted among the committed strokes
              above. */}
          {previewStroke && (
            <g data-testid="preview-stroke" opacity={0.7}>
              <ObjectLayer strokes={[previewStroke]} testIdPrefix="preview-stroke" />
            </g>
          )}

          {/* Every other peer's gesture in progress, in the colour presence gave them rather
              than MDT's — a single point has no direction, so nothing is drawn for one yet. */}
          {cursors
            ?.filter((p) => !p.isSelf && p.drawing && p.drawing.length > 1)
            .map((p) => (
              <g key={`draw-${p.clientId}`} data-peer-drawing={p.clientId} opacity={0.7}>
                <ObjectLayer
                  strokes={[{ ...PREVIEW_STROKE, points: p.drawing! }]}
                  colorOverride={p.color}
                  testIdPrefix={`peer-drawing-${p.clientId}`}
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
                  cloneId={key}
                  enemy={enemy}
                  x={toPixels(clone.x, clone.y).x}
                  y={toPixels(clone.x, clone.y).y}
                  mark={pullMarks?.get(key)}
                  hiddenPips={hiddenPips}
                  isHighlighted={highlighted?.has(key) ?? false}
                  isHovered={hoverClone === key}
                  dimmed={dimOthers && !highlighted?.has(key)}
                  inActivePack={clone.g != null && (clone.g === hoverPack || clone.g === selectedPack)}
                  onEnter={() => {
                    setHoverClone(key)
                    setHoverPack(clone.g)
                    onHoverClone?.({ enemyIdx: enemy.mdtIdx, cloneIdx: clone.mdtIdx })
                  }}
                  onLeave={() => {
                    setHoverClone(null)
                    setHoverPack(null)
                    onHoverClone?.(null)
                  }}
                  onClick={(e) => handleCloneClick({ enemyIdx: enemy.mdtIdx, cloneIdx: clone.mdtIdx }, e)}
                  onContextMenu={(e) => {
                    // Only on a blip, and only when something actually handles the right-click:
                    // with nothing wired to it (the codex tab), the browser's own menu is what
                    // a right-click on a mob should still give you.
                    if (!onCloneContextMenu) return
                    e.preventDefault()
                    onCloneContextMenu({ enemyIdx: enemy.mdtIdx, cloneIdx: clone.mdtIdx })
                  }}
                />
              )
            }),
          )}

          {/* Over the blips, and drawn whether or not the hulls are: a pull with advice written
              about it is information, not part of the outline's decoration. */}
          {[...lookup.packs.values()]
            .filter((pack) => tipPulls.has(pack.g) && !hiddenPips.has('tips'))
            .map((pack) => (
              <PackTipsMark key={`tips-${pack.g}`} pack={pack} />
            ))}

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

      {/* Mounted before the HUD and legend below: neither of those carries a z-index, so with
          no `z-index` anywhere in this file, paint (and hit) order simply follows DOM order.
          A drawing tool's surface has to be *hittable* — it is the drawing target — so it must
          not become the top-most element while a tool is active, or it swallows every click
          meant for the zoom, fit and legend buttons that come after it. */}
      {drawing && (
        <DrawSurface
          transform={transform}
          mode={drawing.mode}
          onProgress={drawing.onProgress}
          onCommit={drawing.onCommit}
        />
      )}

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

      {showLegend && <Legend hidden={hiddenPips} onToggle={togglePip} />}
      {hoverClone && !suppressCloneTooltip && (
        <CloneTooltip slug={slug} lookup={lookup} cloneKeyStr={hoverClone} />
      )}
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
          selectedId={selectedObjectId}
          onSelect={onSelectObject}
          onMove={onMoveObject}
          drawingActive={!!drawing}
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

/**
 * A pull with something written about it.
 *
 * On the pack rather than on a blip: a tip naming `packs:` is advice about taking this group of
 * mobs, and the card it is written on is only where the sentence lives. It sits above the hull
 * rather than at its centre, which is where the blips are.
 */
function PackTipsMark({ pack }: { pack: Pack }) {
  const { t } = useI18n()
  const y = Math.min(...pack.hull.map((p) => p.y)) - 12
  return (
    <g data-badge="tips" data-pack={pack.g} className="pointer-events-none">
      <title>{t('map.badgeTipsPull', { g: pack.g })}</title>
      <circle cx={pack.center.x} cy={y} r={11} fill="#e0b552" stroke="#0b0d12" strokeWidth={2} />
      <text
        x={pack.center.x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={15}
        fontWeight={700}
        fill="#0b0d12"
      >
        ?
      </text>
    </g>
  )
}

interface BlipProps {
  slug: string
  cloneId: string
  enemy: Enemy
  x: number
  y: number
  mark?: PullMark
  /** Pip kinds the reader has switched off in the legend. */
  hiddenPips: ReadonlySet<string>
  isHighlighted: boolean
  isHovered: boolean
  dimmed: boolean
  inActivePack: boolean
  onEnter: () => void
  onLeave: () => void
  onClick: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
}

function Blip({
  slug,
  cloneId,
  enemy,
  x,
  y,
  mark,
  hiddenPips,
  isHighlighted,
  isHovered,
  dimmed,
  inActivePack,
  onEnter,
  onLeave,
  onClick,
  onContextMenu,
}: BlipProps) {
  const { t, locale } = useI18n()
  const ind = getIndicators(slug, enemy, locale)
  const r = blipRadius(enemy, ind.rank)
  const emphasised = isHighlighted || isHovered

  // Indicator pips, laid out in an arc above the portrait.
  const badges: { name: string; color: string; glyph: string; title: string }[] = []
  if (ind.kick) badges.push({ name: 'kick', color: '#d64550', glyph: 'K', title: t('map.badgeKick') })
  if (ind.frontalSpells.length)
    badges.push({ name: 'frontal', color: '#cf6fa0', glyph: 'F', title: t('map.badgeFrontal') })
  if (ind.tankBuster)
    badges.push({ name: 'tank', color: '#4a90c2', glyph: 'T', title: t('map.badgeTank') })
  if (ind.dispel.length)
    badges.push({ name: 'dispel', color: '#7f6fd0', glyph: 'D', title: t('map.badgeDispel') })
  // Only a general tip: that one is about the mob, so it belongs on the mob. A scoped tip is
  // about the pull and is marked on the pack instead — see `PackTipsMark`. `hasTips` stays the
  // card's question, which is neither of these.
  if (ind.generalTips)
    badges.push({ name: 'tips', color: '#e0b552', glyph: '?', title: t('map.badgeTips') })
  const shown = badges.filter((b) => !hiddenPips.has(b.name))
  const placements = badgeArc(shown.length, { x, y }, r)

  return (
    <g
      data-clone={cloneId}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      onContextMenu={onContextMenu}
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

      {/* No pull number here: it belongs to the pull, once, at its outline — see the route
          overlay above. Stamped per clone it drew the same digit eleven times across a big pull,
          over blips already filled and stroked in that pull's colour and already inside its
          hull, which hovering lights up as a whole. */}

      {shown.map((badge, i) => {
        const { x: bx, y: by, r: br } = placements[i]
        return (
          <g key={badge.name} data-badge={badge.name} className="pointer-events-none">
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

function Legend({
  hidden,
  onToggle,
}: {
  hidden: ReadonlySet<string>
  onToggle: (name: string) => void
}) {
  const { t } = useI18n()
  // `name` is the pip's own key, the same one the blip tags its `data-badge` with.
  const rows: [name: string, color: string, glyph: string, label: string][] = [
    ['kick', '#d64550', 'K', t('legend.kick')],
    ['frontal', '#cf6fa0', 'F', t('legend.frontal')],
    ['tank', '#4a90c2', 'T', t('legend.tank')],
    ['dispel', '#7f6fd0', 'D', t('legend.dispel')],
    ['tips', '#e0b552', '?', t('legend.tips')],
  ]
  const ringRows: [string, string][] = [
    ['#cf3f52', t('legend.ring.lethal')],
    ['#d97036', t('legend.ring.high')],
    ['#c9992f', t('legend.ring.medium')],
    ['#5b8f6a', t('legend.ring.low')],
    ['#e0b552', t('legend.ring.boss')],
    ['rgba(180,190,210,0.75)', t('legend.ring.unknown')],
  ]
  // Three rows rather than one for the miniboss: a boss blip has always been bigger than trash
  // and nothing ever said so, and explaining half a vocabulary is worse than explaining none.
  const blipRows: [number, string][] = [
    [10, t('legend.blip.boss')],
    [8, t('legend.blip.miniboss')],
    [6, t('legend.blip.trash')],
  ]
  return (
    // `pointer-events-none` on the panel: open from the start, it covers the top-right of the map
    // for good, and a mob that a pan or a zoom brings underneath it would otherwise stop
    // answering the cursor. The pip rows opt back in individually with `pointer-events-auto`, so
    // the map still hears a click through everything here that is only explanation — which is
    // why the credit below is text and not a link, and why nothing else in here is clickable.
    <div className="pointer-events-none absolute top-3 right-3 w-60 rounded border border-ink-700 bg-ink-900/95 p-3 text-xs shadow-lg">
      <div className="mb-1.5 text-[10px] font-bold tracking-widest text-ink-400">{t('legend.pips')}</div>
      {rows.map(([name, color, glyph, label]) => {
        const off = hidden.has(name)
        return (
          <button
            key={name}
            type="button"
            aria-pressed={!off}
            // Named explicitly: read from its contents the name comes out as the glyph welded to
            // the label — "KSpell to interrupt (from MDT)" — which is the label with noise in
            // front of it. The glyph is there to be matched against the map by eye.
            aria-label={label}
            onClick={() => onToggle(name)}
            // Opacity rather than a strikethrough or a swatch change: what a switched-off row
            // has to look like is the map without it, and the map's own pips are what fade.
            className={`pointer-events-auto mb-1 flex w-full items-center gap-2 rounded text-left transition hover:bg-ink-800 ${
              off ? 'opacity-40' : ''
            }`}
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-ink-950"
              style={{ background: color }}
            >
              {glyph}
            </span>
            <span className="text-ink-300">{label}</span>
          </button>
        )
      })}
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

      <div className="mt-2.5 mb-1.5 text-[10px] font-bold tracking-widest text-ink-400">
        {t('legend.blip')}
      </div>
      {blipRows.map(([size, label]) => (
        <div key={label} className="mb-1 flex items-center gap-2">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center">
            <span
              className="shrink-0 rounded-full bg-ink-600"
              style={{ width: size, height: size }}
            />
          </span>
          <span className="text-ink-300">{label}</span>
        </div>
      ))}

      {/* The credit the codex and route tabs have nowhere else to put: both fill the viewport,
          so `SiteFooter` only reaches the home and briefing pages. Text and no link, because
          the panel is transparent to the pointer and a link here could not be clicked. */}
      <div className="mt-2.5 mb-1 text-[10px] font-bold tracking-widest text-ink-400">
        {t('credits.sources')}
      </div>
      <p className="text-[10px] leading-snug text-ink-500">
        {t('credits.mdt', { version: mdtRelease.version })} {t('credits.blizzardShort')}
      </p>
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
    <div
      data-testid="clone-tooltip"
      className="pointer-events-none absolute top-3 left-3 max-w-72 rounded border border-ink-700 bg-ink-900/95 px-3 py-2 text-sm shadow-lg"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-ink-100">{getNpcLabel(enemy, locale).name}</span>
        {ind.rank === 'boss' && <span className="text-xs text-gold-400">{t('map.boss')}</span>}
        {ind.rank === 'miniboss' && (
          <span className="text-xs text-ink-300">{t('map.miniboss')}</span>
        )}
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
