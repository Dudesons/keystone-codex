// ABOUTME: Which spells the asset fetch has to resolve, from the extracted dungeons.
// ABOUTME: Its own module because fetch-assets.mjs runs its job at import and cannot be imported.

/**
 * Every spell id the app will need a name and an icon for, deduplicated and sorted.
 *
 * Two sources, and the second is easy to forget: a mob's spell list, and the `spellId` a
 * usable item on the map points at. A POI's `texture` is a Blizzard file id we cannot resolve
 * outside the client, so that `spellId` is the only way to draw an item as anything but a dot.
 */
export function collectSpellIds(dungeons) {
  const ids = new Set()
  for (const dungeon of dungeons) {
    for (const enemy of dungeon.enemies ?? []) {
      for (const spell of enemy.spells ?? []) ids.add(spell.id)
    }
    for (const poi of dungeon.pois ?? []) {
      if (poi.info?.spellId) ids.add(poi.info.spellId)
    }
  }
  return [...ids].sort((a, b) => a - b)
}
