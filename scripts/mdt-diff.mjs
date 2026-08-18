// ABOUTME: Compares two snapshots of the generated data and says what changed, semantically.
// ABOUTME: Pure. Reads clone coordinates only to measure movement; never reports one by value.

/**
 * Comparing two generated snapshots.
 *
 * `git diff` is unusable on these files: clone x/y are floats, and a textual diff is mostly
 * noise about positions nobody asked about directly. Everything here is therefore either a set
 * comparison on ids, a scalar comparison on a named field, or -- for a clone's position -- a
 * distance measured against a threshold. No coordinate is ever reported by value.
 */

const META_FIELDS = ['mdtIndex', 'mapID', 'teleportId', 'totalCount', 'sublevelCount', 'englishName']

/** The per-mob scalar fields diffOneMob compares directly, field by field. */
const MOB_SCALAR_FIELDS = ['count', 'health', 'level', 'isBoss', 'scale']

/**
 * Distance, in MDT map units, above which a moved clone is worth naming rather than folded
 * into rounding or an editor's hand not landing on the exact same spot twice.
 *
 * MDT's frame is 840 by 560 (`MDT_GEOMETRY` in `scripts/config.mjs`), so 20 units is a couple
 * of percent of the map's width -- small on the map, but enough that a mob has changed corner
 * rather than been nudged.
 */
const MOVEMENT_THRESHOLD = 20

/**
 * Distances moved by clones present on both sides, matched by `mdtIdx` -- never by array
 * position, which an inserted or removed clone would shift and so invent movement that never
 * happened (see .claude/lessons.md, "Diff data files by identity, not by line membership"). A
 * clone present on only one side is not movement: that is what the clone-count finding already
 * covers, and is not duplicated here.
 */
function movedClones(before, after) {
  const beforeByIdx = new Map((before.clones ?? []).map((c) => [c.mdtIdx, c]))
  const distances = []
  for (const afterClone of after.clones ?? []) {
    const beforeClone = beforeByIdx.get(afterClone.mdtIdx)
    if (!beforeClone) continue
    const distance = Math.hypot(afterClone.x - beforeClone.x, afterClone.y - beforeClone.y)
    if (distance > 0) distances.push(distance)
  }
  return distances
}

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
    out.push(finding({ dungeon: slug, subject, what: `lost spell ${id}` }))
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

  for (const field of MOB_SCALAR_FIELDS) {
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

  // One finding for the whole mob, not one per clone: a human deciding whether to care needs
  // how many clones moved and how far the worst of them went, not a line each. The mob is
  // reported when its furthest clone clears the threshold, but the count in the sentence must
  // count the same population -- clones that themselves moved more than the threshold -- or a
  // mob with one clone dragged across the map and eleven others nudged by half a unit would
  // read as "12 of 12 clones moved", overstating how much of it actually relocated.
  const distances = movedClones(before, after)
  const furthest = distances.length ? Math.max(...distances) : 0
  if (furthest > MOVEMENT_THRESHOLD) {
    const total = (after.clones ?? []).length
    // A mob with exactly one clone has no count worth stating -- "1 of 1 clones moved" says
    // nothing a plain distance doesn't, and every phrasing of that count reads awkwardly for a
    // single clone. Rather than reach for pluralisation, the one-clone case drops the count
    // entirely; a mob with several keeps naming how many cleared the threshold.
    const detail = total === 1
      ? `by ${Math.round(furthest)} units`
      : `${distances.filter((d) => d > MOVEMENT_THRESHOLD).length} of ${total} clones moved more than ${MOVEMENT_THRESHOLD} units, the furthest by ${Math.round(furthest)}`
    out.push(finding({ dungeon: slug, subject, what: 'moved on the map', detail }))
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

/** The tooltip fields a card's note quotes, and which therefore date it when they move. */
const TEXT_FIELDS = ['name', 'castTime', 'description']

/**
 * What changed in the spell table.
 *
 * A spell **appearing** is not reported: the mob diff already says which mob gained it, which is
 * the actionable half. A spell **leaving** is reported, because a note may still point at it.
 *
 * `annotatedIds` carries the spell ids some card annotates. A tooltip that moves under a note is
 * severity 3 — the note quotes numbers from it — while the same change on an unannotated spell is
 * a fact about the data and nothing more.
 */
/**
 * One finding, when the spell label table is byte-identical between two revisions.
 *
 * Severity 3 can only ever fire when a tooltip's text actually moved, and `fetch-assets.mjs`
 * never re-fetches an already-cached spell -- only `FORCE=1 npm run fetch:assets` rebuilds the
 * table. An unchanged table between two revisions is therefore not the same fact as "no tooltip
 * moved": it may equally mean no tooltip was even looked at, and a reader who only sees an empty
 * severity 3 cannot tell the two apart. Takes the raw text each revision's `spells.json` was
 * written as, not the parsed table, and compares it byte for byte -- that is the only fact this
 * finding reports, and it is cheaper and more honest than deep-comparing parsed objects to reach
 * the same conclusion.
 */
export function labelTableFindings(beforeRaw, afterRaw) {
  if (beforeRaw !== afterRaw) return []
  return [finding({
    dungeon: '',
    subject: 'spell label table',
    what: 'did not change between these two revisions, so nothing at severity 3 could be found',
    action:
      'FORCE=1 npm run fetch:assets is what re-fetches tooltips; a game patch, not an MDT update, is what moves them',
  })]
}

export function diffSpells(before, after, annotatedIds) {
  const out = []

  for (const id of Object.keys(before)) {
    const annotated = annotatedIds.has(Number(id))
    const severity = annotated ? 3 : 6

    if (!after[id]) {
      out.push(finding({
        severity,
        dungeon: '',
        subject: `spell ${id}`,
        what: 'left the data',
        ...(annotated ? { action: 'a card annotates it: the note no longer renders' } : {}),
      }))
      continue
    }

    for (const lang of Object.keys(before[id].text ?? {})) {
      const was = before[id].text[lang] ?? {}
      const is = after[id].text?.[lang] ?? {}
      for (const field of TEXT_FIELDS) {
        if (was[field] === is[field]) continue
        out.push(finding({
          severity,
          dungeon: '',
          subject: `spell ${id}`,
          what: `${field} changed`,
          detail: `[${lang}] ${was[field] ?? '(none)'} -> ${is[field] ?? '(none)'}`,
          ...(annotated ? { action: 'reread the note: it may quote numbers from the old text' } : {}),
        }))
      }
    }
  }

  return out
}
