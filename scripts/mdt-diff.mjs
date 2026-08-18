// ABOUTME: Compares two snapshots of the generated data and says what changed, semantically.
// ABOUTME: Pure, and deliberately blind to coordinates, which move on every MDT recapture.

/**
 * Comparing two generated snapshots.
 *
 * `git diff` is unusable on these files: clone x/y are floats that MDT rewrites on every
 * recapture, so a textual diff is mostly noise about positions nobody asked about. Everything
 * here is therefore either a set comparison on ids or a scalar comparison on a named field, and
 * no coordinate is ever read.
 */

const META_FIELDS = ['mdtIndex', 'mapID', 'teleportId', 'totalCount', 'sublevelCount', 'englishName']

const finding = (f) => ({ severity: 6, ...f })

/** Set difference on ids, order-independent and hole-tolerant. */
function missing(from, against) {
  const have = new Set(against)
  return [...new Set(from)].filter((id) => !have.has(id))
}

const subjectOf = (enemy) => `${enemy.id} ${enemy.name}`

/** Packs are the distinct `g` values a mob's clones belong to; nulls are ungrouped clones. */
function packsOf(enemy) {
  return new Set((enemy.clones ?? []).map((c) => c.g).filter((g) => g !== null && g !== undefined))
}

function diffOneMob(slug, before, after) {
  const out = []
  const subject = subjectOf(after)

  const beforeSpells = (before.spells ?? []).map((s) => s.id)
  const afterSpells = (after.spells ?? []).map((s) => s.id)
  for (const id of missing(beforeSpells, afterSpells)) {
    out.push(finding({
      dungeon: slug,
      subject,
      what: `lost spell ${id}`,
      action: `check content/${slug}/ for a note on ${id}: it no longer renders`,
    }))
  }
  for (const id of missing(afterSpells, beforeSpells)) {
    out.push(finding({ dungeon: slug, subject, what: `gained spell ${id}` }))
  }

  for (const cc of missing(before.cc ?? [], after.cc ?? [])) {
    out.push(finding({ dungeon: slug, subject, what: `is no longer subject to ${cc}` }))
  }
  for (const cc of missing(after.cc ?? [], before.cc ?? [])) {
    out.push(finding({ dungeon: slug, subject, what: `is now subject to ${cc}` }))
  }

  for (const field of ['count', 'health', 'level', 'isBoss']) {
    if (before[field] !== after[field]) {
      out.push(finding({
        dungeon: slug,
        subject,
        what: `${field} changed`,
        detail: `${before[field]} -> ${after[field]}`,
      }))
    }
  }

  const beforeClones = (before.clones ?? []).length
  const afterClones = (after.clones ?? []).length
  if (beforeClones !== afterClones) {
    out.push(finding({
      dungeon: slug,
      subject,
      what: 'clone count changed',
      detail: `${beforeClones} -> ${afterClones} clones`,
    }))
  }

  const beforePacks = packsOf(before)
  const afterPacks = packsOf(after)
  if (beforePacks.size !== afterPacks.size || [...beforePacks].some((g) => !afterPacks.has(g))) {
    out.push(finding({
      dungeon: slug,
      subject,
      what: 'pack grouping changed',
      detail: `packs ${[...beforePacks].sort((a, b) => a - b).join(',')} -> ${[...afterPacks].sort((a, b) => a - b).join(',')}`,
    }))
  }

  return out
}

/**
 * What changed in one dungeon between two snapshots.
 *
 * A null `before` means the dungeon is new at this revision: one finding says so, and comparing
 * its mobs against nothing would only restate it several hundred times.
 */
export function diffDungeon(before, after) {
  const slug = after.slug
  if (!before) {
    return [finding({
      severity: 4,
      dungeon: slug,
      subject: after.englishName,
      what: 'is a new dungeon: no card exists for any of its mobs',
      detail: `${after.enemies.length} mobs`,
      action: 'run npm run scaffold, then write the cards',
    })]
  }

  const out = []

  for (const field of META_FIELDS) {
    if (before[field] !== after[field]) {
      out.push(finding({
        dungeon: slug,
        subject: after.englishName,
        what: `${field} changed`,
        detail: `${before[field]} -> ${after[field]}`,
      }))
    }
  }

  if (before.textureFolder !== after.textureFolder) {
    out.push(finding({
      dungeon: slug,
      subject: after.englishName,
      what: 'textureFolder changed',
      detail: `${before.textureFolder} -> ${after.textureFolder}`,
      action: 'run npm run build:maps: the committed map no longer matches the tiles',
    }))
  }

  const beforeById = new Map((before.enemies ?? []).map((e) => [e.id, e]))
  const afterById = new Map((after.enemies ?? []).map((e) => [e.id, e]))

  for (const [id, enemy] of beforeById) {
    if (!afterById.has(id)) {
      out.push(finding({
        dungeon: slug,
        subject: subjectOf(enemy),
        what: 'left the dungeon',
        action: `its card in content/${slug}/ is now dead weight`,
      }))
    }
  }
  for (const [id, enemy] of afterById) {
    if (!beforeById.has(id)) {
      out.push(finding({
        severity: 4,
        dungeon: slug,
        subject: subjectOf(enemy),
        what: 'is new in this dungeon',
        action: 'run npm run scaffold, then write the card',
      }))
      continue
    }
    out.push(...diffOneMob(slug, beforeById.get(id), enemy))
  }

  return out
}
