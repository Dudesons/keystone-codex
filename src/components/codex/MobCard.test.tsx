// ABOUTME: Tests a mob card against real MDT data and real content/ entries.
// ABOUTME: Covers the header, trap, CC, spell ordering, Wowhead links and interactions.

// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Without `globals: true`, Testing Library does not register its automatic cleanup: renders
// would pile up in the document and skew the `screen` queries.
afterEach(cleanup)
import type { Enemy } from '../../lib/types'
import { getMobContent, inlineMarkdown } from '../../lib/content'
import { dungeonList, getDungeon, getLookup } from '../../lib/data'
import { en } from '../../lib/i18n/en'
import { DEFAULT_LOCALE } from '../../lib/i18n/locales'
import { tipsSectionId } from '../../lib/tips'
import { renderEn, renderFr } from '../../test/render'
import MobCard from './MobCard'

const SLUG = 'altar-of-fangs'
const lookup = getLookup(SLUG)!

/** Ritual Chieftain: threat "high", a trap, and spells tagged kick / tank / dodge. */
const chieftain = lookup.dungeon.enemies.find((e) => e.id === 270_306)!
const boss = lookup.dungeon.enemies.find((e) => e.isBoss)!

/** Ula'tek's Chosen: two interrupts, a frontal, two dodges, a dispel — pins TAG_ORDER. */
const chosen = lookup.dungeon.enemies.find((e) => e.id === 263_109)!
const withoutCc = lookup.dungeon.enemies.find((e) => e.cc.length === 0)!

const pool = dungeonList.flatMap((d) =>
  (getDungeon(d.slug)?.enemies ?? []).map((enemy) => ({ slug: d.slug, enemy })),
)

/** No mob in altar-of-fangs declares any CC, so look across the whole pool. */
const withCc = pool.find(({ enemy }) => enemy.cc.length > 0)!

/**
 * A mob with an empty CC list inside a dungeon MDT *did* fill in — the only case where the
 * empty list carries a meaning of its own. Derived here rather than through `hasCcData`, so
 * the fixture does not rest on the flag it is meant to exercise.
 */
const dungeonHasCc = (slug: string) => (getDungeon(slug)?.enemies ?? []).some((e) => e.cc.length > 0)
const immune = pool.find(({ slug, enemy }) => enemy.cc.length === 0 && dungeonHasCc(slug))!

/** A synthetic mob of the real type: covers cases the pool data does not contain. */
const unknown: Enemy = {
  mdtIdx: 1,
  id: 888_001,
  name: 'Mob with no entry',
  count: 0,
  health: 1000,
  level: 80,
  scale: 1,
  cc: [],
  spells: [{ id: 999_777 }],
  clones: [{ mdtIdx: 1, x: 0, y: 0, g: null, sublevel: 1 }],
}

describe('Header', () => {
  it('carries the npcId, so the map can scroll to the entry', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.querySelector(`[data-npc="${chieftain.id}"]`)).not.toBeNull()
  })

  it('shows the mob name', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText(chieftain.name)).toBeDefined()
  })

  it('names the mob in the reader’s language, and its creature type with it', () => {
    const { container } = renderFr(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('Chef du rituel')).toBeDefined()
    expect(container.textContent).toContain('Humanoïde')
  })

  it("falls back to MDT's name for a mob the label pipeline never resolved", () => {
    // The invariant holds in every language: an id Wowhead has no answer for still renders.
    renderFr(<MobCard slug={SLUG} enemy={unknown} />)
    expect(screen.getByText(unknown.name)).toBeDefined()
  })

  it('flags bosses', () => {
    renderEn(<MobCard slug={SLUG} enemy={boss} />)
    expect(screen.getByText('BOSS')).toBeDefined()
  })

  it('takes the threat from the written entry', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('Dangerous')).toBeDefined()
  })

  it('shows the KICK and TANK pills derived from the indicators', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    const header = container.querySelector('header')!
    expect(header.textContent).toContain('KICK')
    expect(header.textContent).toContain('TANK')
  })

  it('translates the role, a closed vocabulary like the threat level', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.textContent).toContain('Melee')

    cleanup()
    expect(renderFr(<MobCard slug={SLUG} enemy={chieftain} />).container.textContent).toContain(
      'Mêlée',
    )
  })

  it('announces forces and unit count', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.textContent).toContain(`${chieftain.count} forces`)
    expect(container.textContent).toMatch(/\d+ units?/)
  })

  it('writes "no forces" rather than "0 forces"', () => {
    const { container } = renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(container.textContent).toContain('no forces')
  })

  it('shows the pull number when the route holds one', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} pullIndex={2} pullColor="ff3eff" />)
    expect(screen.getByTitle('Pull 3').textContent).toBe('3')
  })

  it('shows no pull number without a route', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.queryByTitle(/^Pull /)).toBeNull()
  })
})

/**
 * The trap paragraph, found without depending on the label's language: it is the paragraph
 * inside the block that carries the lethal-threat accent.
 */
const trapText = (container: HTMLElement) =>
  container.querySelector('.border-threat-lethal p')?.innerHTML

/** Reads markdown back as the browser would, so entity escaping does not skew a comparison. */
const asRendered = (markdown: string) => {
  const el = document.createElement('p')
  el.innerHTML = inlineMarkdown(markdown)
  return el.innerHTML
}

describe('The trap', () => {
  // The trap sentence is judgement and gets rewritten as entries are revised, so these read
  // the expected text out of the entry rather than hardcoding it.
  it('puts the written trap up front', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('THE TRAP')).toBeDefined()
    const trap = getMobContent(SLUG, chieftain.id, 'en')!.trap!
    expect(trapText(container)).toBe(asRendered(trap))
  })

  it('serves the trap and the notes in the chosen language', () => {
    cleanup()
    const french = getMobContent(SLUG, chieftain.id, 'fr')!.trap!
    expect(french).not.toBe(getMobContent(SLUG, chieftain.id, 'en')!.trap)
    const { container } = renderFr(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.getByText('LE PIÈGE')).toBeDefined()
    expect(trapText(container)).toBe(asRendered(french))
  })

  it('shows no trap block when nothing is written', () => {
    renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(screen.queryByText('THE TRAP')).toBeNull()
  })
})

/**
 * The base-language mark, on the one entry guaranteed to keep needing it.
 *
 * `__fixtures__` is no dungeon in the pool, so there is no lookup to take a mob out of — which
 * is the point. The real cards get translated; the fixture stays half translated on purpose,
 * and it is what keeps this behaviour covered afterwards. The mark's text is read out of
 * `DEFAULT_LOCALE` rather than typed, so it follows the base language instead of asserting it.
 */
describe('Text still in the base language', () => {
  const FIXTURES = '__fixtures__'
  const MARK = DEFAULT_LOCALE.toUpperCase()

  /** The partially translated fixture entry, as an Enemy of the real shape. */
  const halfTranslated: Enemy = {
    mdtIdx: 1,
    id: 263_109,
    name: "Ula'tek's Chosen",
    count: 25,
    health: 1000,
    level: 80,
    scale: 1,
    cc: [],
    spells: [{ id: 1_307_567 }, { id: 1_306_852 }, { id: 1_306_853 }],
    clones: [{ mdtIdx: 1, x: 0, y: 0, g: null, sublevel: 1 }],
  }

  const markedRow = (container: HTMLElement, spellId: number) =>
    container.querySelector(`[data-spell="${spellId}"]`)!.textContent!.includes(MARK)

  it('marks the note the translation has not reached, and leaves the translated one alone', () => {
    const { container } = renderFr(<MobCard slug={FIXTURES} enemy={halfTranslated} />)
    // The fixture translates 1307567's note and not 1306852's.
    expect(markedRow(container, 1_306_852)).toBe(true)
    expect(markedRow(container, 1_307_567)).toBe(false)
  })

  it('leaves a spell with no written note unmarked: its description is already localized', () => {
    // Nothing of ours is being served in the wrong language — the row shows Wowhead's French.
    const { container } = renderFr(<MobCard slug={FIXTURES} enemy={halfTranslated} />)
    expect(markedRow(container, 1_306_853)).toBe(false)
  })

  it('marks the untranslated prose and tips, and spares the translated trap', () => {
    const { container } = renderFr(<MobCard slug={FIXTURES} enemy={halfTranslated} />)
    // Three marks and no more: the untranslated note, the untranslated prose, and the
    // untranslated tips section (the fr sibling carries no `tips` of its own). The trap is
    // translated, and counting proves it carries none without having to select its block.
    expect(screen.queryAllByText(MARK)).toHaveLength(3)
    expect(container.querySelector('.prose-codex')).not.toBeNull()
    expect(container.querySelector('.border-threat-lethal')!.textContent).not.toContain(MARK)
  })

  it('marks nothing at all for a reader of the base language', () => {
    renderEn(<MobCard slug={FIXTURES} enemy={halfTranslated} />)
    expect(screen.queryAllByText(MARK)).toHaveLength(0)
  })

  it('marks nothing on an entry translated all the way through', () => {
    renderFr(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.queryAllByText(MARK)).toHaveLength(0)
  })
})

describe('Applicable crowd control', () => {
  it('lists the crowd control MDT declares', () => {
    const { container } = renderEn(<MobCard slug={withCc.slug} enemy={withCc.enemy} />)
    expect(container.textContent).toContain('APPLICABLE CC')
    expect(container.textContent).toContain(withCc.enemy.cc[0])
  })

  it('says outright that a mob with no CC is immune, when its dungeon has CC data', () => {
    renderEn(<MobCard slug={immune.slug} enemy={immune.enemy} />)
    expect(screen.getByText('Immune to every CC listed by MDT.')).toBeDefined()
  })

  it('claims no immunity for a dungeon MDT never filled in', () => {
    renderEn(<MobCard slug={SLUG} enemy={withoutCc} />)
    expect(screen.queryByText('Immune to every CC listed by MDT.')).toBeNull()
    expect(screen.getByText('MDT has no CC data for this dungeon.')).toBeDefined()
  })

  it('says the same in French', () => {
    renderFr(<MobCard slug={SLUG} enemy={withoutCc} />)
    expect(screen.getByText('MDT n’a pas de données de CC pour ce donjon.')).toBeDefined()
  })

  it('treats a dungeon it knows nothing about as missing data, not as immunity', () => {
    renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(screen.getByText('MDT has no CC data for this dungeon.')).toBeDefined()
  })

  it('hides the section in compact mode', () => {
    const { container } = renderEn(<MobCard slug={withCc.slug} enemy={withCc.enemy} compact />)
    expect(container.textContent).not.toContain('APPLICABLE CC')
  })
})

describe('Spells', () => {
  it('marks each row with its spell id, so a briefing chip can land on one', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    // A data attribute rather than an `id`: the panel's list view renders forty cards at
    // once, and two mobs sharing a spell would otherwise share a document id.
    expect(container.querySelector('[data-spell="1306911"]')).not.toBeNull()
  })

  it('floats what needs an immediate reaction: kick before tank', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    // Read the order off the spell links rather than off the prose: the notes and the trap
    // are rewritten as entries are revised, and they quote the same figures.
    const ids = [...container.querySelectorAll<HTMLAnchorElement>('a[href*="wowhead.com/spell="]')]
      .map((a) => Number(a.href.split('spell=')[1]))
    const spells = getMobContent(SLUG, chieftain.id, 'en')!.spells!
    const kick = spells.find((s) => s.tag === 'kick')!.id
    const tank = spells.find((s) => s.tag === 'tank')!.id
    expect(ids.indexOf(kick)).toBeGreaterThan(-1)
    expect(ids.indexOf(kick)).toBeLessThan(ids.indexOf(tank))
  })

  /** Spell ids in the order the card lists them. Names repeat here, hrefs do not. */
  const renderedIds = (enemy: typeof chosen) => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={enemy} />)
    return [...container.querySelectorAll<HTMLAnchorElement>('a[href*="spell="]')].map(
      (a) => Number(a.getAttribute('href')!.match(/spell=(\d+)/)![1]),
    )
  }

  it('ranks a frontal below the interrupts and above the rest', () => {
    const ids = renderedIds(chosen)
    const at = (id: number) => ids.indexOf(id)
    // A tag absent from TAG_ORDER would indexOf to -1 and sort above everything.
    expect(at(1_306_852)).toBeGreaterThan(at(1_307_567))
    expect(at(1_306_852)).toBeGreaterThan(at(1_289_416))
    expect(at(1_306_852)).toBeLessThan(at(1_307_571))
  })

  it('links every spell to Wowhead', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    const link = container.querySelector<HTMLAnchorElement>('a[href*="wowhead.com/spell="]')!
    expect(link).not.toBeNull()
    expect(link.target).toBe('_blank')
    expect(link.rel).toBe('noreferrer')
  })

  it('names a spell missing from spells.json by its identifier', () => {
    renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(screen.getByText('Spell 999777')).toBeDefined()
  })

  it('renders no spell row for a mob that has none', () => {
    const { container } = renderEn(
      <MobCard slug="dungeon-without-content" enemy={{ ...unknown, id: 888_002, spells: [] }} />,
    )
    expect(container.querySelector('a[href*="wowhead.com/spell="]')).toBeNull()
  })
})

describe('Prose', () => {
  it('renders the free-form writing of the entry', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(container.querySelector('.prose-codex')).not.toBeNull()
  })

  it('hides it in compact mode', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} compact />)
    expect(container.querySelector('.prose-codex')).toBeNull()
  })
})

describe('Interactions', () => {
  it('reports hover, then the pointer leaving', () => {
    const seen: (number | null)[] = []
    const { container } = renderEn(
      <MobCard slug={SLUG} enemy={chieftain} onHover={(id) => seen.push(id)} />,
    )
    const article = container.querySelector('article')!
    fireEvent.mouseEnter(article)
    fireEvent.mouseLeave(article)
    expect(seen).toEqual([chieftain.id, null])
  })

  it('reports the selection when the header is clicked', () => {
    const seen: number[] = []
    const { container } = renderEn(
      <MobCard slug={SLUG} enemy={chieftain} onSelect={(id) => seen.push(id)} />,
    )
    fireEvent.click(container.querySelector('header')!)
    expect(seen).toEqual([chieftain.id])
  })

  it('only looks clickable when a handler is supplied', () => {
    const { container: without } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(without.querySelector('header')!.className).not.toContain('cursor-pointer')

    const { container: with_ } = renderEn(
      <MobCard slug={SLUG} enemy={chieftain} onSelect={() => {}} />,
    )
    expect(with_.querySelector('header')!.className).toContain('cursor-pointer')
  })
})

/**
 * `trap` and a spell's `note` are authored markdown, like the prose body — a written entry
 * should not have to choose between emphasis and rendering correctly. A spell's Wowhead
 * description is *not* ours and stays plain text.
 */
describe('Markdown in the one-line fields', () => {
  it('renders emphasis in the trap', () => {
    const { container } = renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(trapText(container)).toContain('<strong>Blood Sacrifice</strong>')
  })

  it('renders emphasis in the trap in every language', () => {
    cleanup()
    const { container } = renderFr(<MobCard slug={SLUG} enemy={chieftain} />)
    // A different string from the English case on purpose: a trap names its spells with the
    // label the chips beside it use, so the French entry emphasises the French name.
    expect(trapText(container)).toContain('<strong>Sacrifice de sang</strong>')
  })

  it('leaves a Wowhead description alone: it is data, not our writing', () => {
    const { container } = renderEn(<MobCard slug="dungeon-without-content" enemy={unknown} />)
    expect(container.innerHTML).not.toContain('<strong>')
  })
})

describe('Tips', () => {
  it('shows the section for a card that carries tips', () => {
    const { container } = renderEn(<MobCard slug="__fixtures__" enemy={chosen} />)
    expect(container.querySelector('iframe')).toBeNull()
    expect(screen.getByRole('button', { name: 'Fixture video' })).toBeTruthy()
  })

  it('hides it in compact, where the prose and the CC are hidden too', () => {
    renderEn(<MobCard slug="__fixtures__" enemy={chosen} compact />)
    expect(screen.queryByRole('button', { name: 'Fixture video' })).toBeNull()
  })

  it('shows no section at all for a card that carries none', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.queryByText(en['tip.section'])).toBeNull()
  })
})

describe('Tips badge', () => {
  it('marks a card whose mob has tips', () => {
    renderEn(<MobCard slug="__fixtures__" enemy={chosen} />)
    expect(screen.getByRole('button', { name: en['tip.jump'] })).toBeTruthy()
  })

  it('leaves a card without tips unmarked', () => {
    renderEn(<MobCard slug={SLUG} enemy={chieftain} />)
    expect(screen.queryByRole('button', { name: en['tip.jump'] })).toBeNull()
  })

  it('does not offer the jump in compact, where the section is not rendered', () => {
    renderEn(<MobCard slug="__fixtures__" enemy={chosen} compact />)
    expect(screen.queryByRole('button', { name: en['tip.jump'] })).toBeNull()
  })

  it('scrolls the tips section into view when clicked', () => {
    // Follows the CodexPanel.test.tsx convention for a test-scoped stub: save the original,
    // install a spy, and restore it in `finally` so it cannot leak into a later test.
    const scrollIntoView = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      renderEn(<MobCard slug="__fixtures__" enemy={chosen} />)
      fireEvent.click(screen.getByRole('button', { name: en['tip.jump'] }))
      expect(scrollIntoView).toHaveBeenCalled()
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('washes the tips section on the way in, so the eye lands on what it scrolled to', () => {
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = () => {}
    try {
      const { container } = renderEn(<MobCard slug="__fixtures__" enemy={chosen} />)
      const section = container.querySelector(`#${CSS.escape(tipsSectionId(chosen.id))}`)!
      expect(section.className).not.toContain('tips-flash')

      fireEvent.click(screen.getByRole('button', { name: en['tip.jump'] }))
      expect(section.className).toContain('tips-flash')
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('washes it again on a second jump, once the first wash has finished', () => {
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = () => {}
    try {
      const { container } = renderEn(<MobCard slug="__fixtures__" enemy={chosen} />)
      const section = container.querySelector(`#${CSS.escape(tipsSectionId(chosen.id))}`)!
      const jump = screen.getByRole('button', { name: en['tip.jump'] })

      fireEvent.click(jump)
      fireEvent.animationEnd(section)
      expect(section.className).not.toContain('tips-flash')

      fireEvent.click(jump)
      expect(section.className).toContain('tips-flash')
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('does not select the mob when the jump is clicked, unlike the header itself', () => {
    // `stopPropagation()` in `TipsJumpBadge` exists precisely to keep this click from also
    // firing the header's `onSelect` (see the `Interactions` describe block above for the
    // header's own case). Asserting only the absence would pass just as well if `onSelect`
    // were never wired up at all, so the second click - on the header - proves the wiring is
    // live and the first result is a real guard, not a vacuous one.
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = () => {}
    try {
      const seen: number[] = []
      const { container } = renderEn(
        <MobCard slug="__fixtures__" enemy={chosen} onSelect={(id) => seen.push(id)} />,
      )
      fireEvent.click(screen.getByRole('button', { name: en['tip.jump'] }))
      expect(seen).toEqual([])

      fireEvent.click(container.querySelector('header')!)
      expect(seen).toEqual([chosen.id])
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })
})

describe('Rank in the header', () => {
  /** The fixture card that declares `rank: miniboss`, as an Enemy of the real shape. */
  const ranked: Enemy = {
    mdtIdx: 1,
    id: 888_010,
    name: 'Ranked Miniboss',
    count: 0,
    health: 1000,
    level: 80,
    scale: 1,
    cc: [],
    spells: [],
    clones: [{ mdtIdx: 1, x: 0, y: 0, g: null, sublevel: 1 }],
  }

  it('marks a miniboss, and does not call it a boss', () => {
    renderEn(<MobCard slug="__fixtures__" enemy={ranked} />)
    expect(screen.getByText('MINIBOSS')).toBeTruthy()
    expect(screen.queryByText('BOSS')).toBeNull()
  })

  // MDT flags it, the card demotes it: the header has to follow the card, or the codex and the
  // map would disagree about the same mob.
  it('says miniboss even when MDT flags the mob as a boss', () => {
    renderEn(<MobCard slug="__fixtures__" enemy={{ ...ranked, isBoss: true }} />)
    expect(screen.getByText('MINIBOSS')).toBeTruthy()
    expect(screen.queryByText('BOSS')).toBeNull()
  })
})
