// ABOUTME: The dungeon's points of interest — usable items and entrances — drawn on the map.
// ABOUTME: Inside the transformed svg, like the blips: an item belongs to a place, not a screen.

import type { Poi } from '../../lib/types'
import { getSpell, iconUrl } from '../../lib/data'
import { toPixels } from '../../lib/geometry'
import { useI18n } from '../../lib/i18n/context'

/** Map pixels per unit of a POI's declared `size`, chosen so a size-15 item reads like a pip. */
const SIZE_UNIT = 1.6

const radiusOf = (poi: Poi) => ((poi.info?.size ?? 12) * (poi.sizeMult ?? 1) * SIZE_UNIT) / 2

export default function PoiLayer({
  pois,
  onHover,
}: {
  pois: Poi[]
  onHover: (index: number | null) => void
}) {
  const { t } = useI18n()
  return (
    <>
      {/* Its own clip, rather than DungeonMap's `blip-clip`: a layer that depends on a
          `<defs>` declared by its parent cannot be mounted — or tested — on its own.
          A fragment, not a wrapping `<g>`: DungeonMap.test.tsx finds blips by
          `svg > g` filtered to those with a circle, and an empty wrapper whose only
          circle is this clip definition would count as an extra blip. */}
      <defs>
        <clipPath id="poi-icon-clip" clipPathUnits="objectBoundingBox">
          <circle cx="0.5" cy="0.5" r="0.5" />
        </clipPath>
      </defs>
      {pois.map((poi, index) => {
        const { x, y } = toPixels(poi.x, poi.y)
        const r = radiusOf(poi)
        const spell = poi.info ? getSpell(poi.info.spellId) : undefined
        return (
          <g
            key={`poi-${index}`}
            data-testid={`poi-${index}`}
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: 'help' }}
          >
            <circle cx={x} cy={y} r={r + 2} fill="#0b0d12" fillOpacity={0.75} stroke="#7fb069" strokeWidth={2} />
            {spell ? (
              <image href={iconUrl(spell.icon)} x={x - r} y={y - r} width={r * 2} height={r * 2} clipPath="url(#poi-icon-clip)" />
            ) : (
              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={r * 1.4} fill="#7fb069">
                {poi.type === 'dungeonEntrance' ? '⌂' : '?'}
              </text>
            )}
            <title>{poi.type === 'dungeonEntrance' ? t('map.dungeonEntrance') : (spell?.name ?? t('map.item'))}</title>
          </g>
        )
      })}
    </>
  )
}

/** The hover panel, in the slot `CloneTooltip` uses: one hover slot, one convention. */
export function PoiTooltip({ poi }: { poi: Poi }) {
  const { t, locale } = useI18n()
  const spell = poi.info ? getSpell(poi.info.spellId, locale) : undefined
  const title =
    poi.type === 'dungeonEntrance' ? t('map.dungeonEntrance') : (spell?.name ?? String(poi.info?.spellId ?? ''))

  return (
    <div className="pointer-events-none absolute top-3 left-3 max-w-72 rounded border border-ink-700 bg-ink-900/95 px-3 py-2 text-sm shadow-lg">
      <div className="flex items-center gap-2">
        {spell && <img src={iconUrl(spell.icon)} alt="" className="h-6 w-6 rounded" />}
        <span className="font-semibold text-ink-100">{title}</span>
      </div>
      {/* Only an item gets a category line: an entrance's title already says "Dungeon
          entrance", and repeating it here would be the same text twice in one tooltip. */}
      {poi.type !== 'dungeonEntrance' && <div className="mt-0.5 text-xs text-ink-400">{t('map.item')}</div>}
      {spell?.description && <p className="mt-1 text-xs text-ink-300">{spell.description}</p>}
    </div>
  )
}
