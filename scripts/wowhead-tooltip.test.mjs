// ABOUTME: Tests the tooltip parsing against captured Wowhead responses in two languages.
// ABOUTME: Pins that classifyLines does NOT match the French wording — position alone places it.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildSpellText,
  buildText,
  classifyLines,
  parseTooltip,
  stripTags,
  tooltipDescription,
  tooltipLines,
} from './wowhead-tooltip.mjs'

/**
 * Real responses captured from Wowhead — see __fixtures__/wowhead/README.md. The tests never
 * call the network: what is under test is our parsing, not Wowhead's uptime.
 */
const fixture = (name) =>
  JSON.parse(
    fs.readFileSync(fileURLToPath(new URL(`./__fixtures__/wowhead/${name}.json`, import.meta.url)), 'utf8'),
  )

const dismemberEn = parseTooltip(fixture('dismember.en'))
const dismemberFr = parseTooltip(fixture('dismember.fr'))
const fadeOutEn = parseTooltip(fixture('fade-out.en'))
const fadeOutFr = parseTooltip(fixture('fade-out.fr'))

describe('parseTooltip', () => {
  it('reads the name and the icon', () => {
    expect(dismemberEn.name).toBe('Dismember')
    expect(dismemberEn.icon).toBe('ability_criticalstrike')
  })

  it('reads the header lines, name excluded', () => {
    expect(dismemberEn.lines).toEqual(['Unlimited range', '3 sec cast'])
    expect(fadeOutEn.lines).toEqual(['Instant'])
  })

  it('reads the description out of the `q` block', () => {
    expect(dismemberEn.description).toContain('581895 Physical damage')
    expect(fadeOutEn.description).toBe('Turns the caster invisible for 2 sec.')
  })

  it('ignores the separate buff block some spells carry', () => {
    // Fade Out ships a second table describing the aura; it must not leak into the spell.
    expect(fadeOutEn.lines.join(' ')).not.toContain('Invisible')
    expect(fadeOutEn.description).not.toContain('remaining')
  })

  it('gives up on a response with no name', () => {
    expect(parseTooltip({})).toBeNull()
    expect(parseTooltip(null)).toBeNull()
  })

  it('survives a response with no tooltip HTML at all', () => {
    expect(parseTooltip({ name: 'Bare', icon: 'x' })).toEqual({
      name: 'Bare',
      icon: 'x',
      lines: [],
      description: undefined,
    })
  })
})

describe('stripTags', () => {
  it('turns line breaks into newlines and drops the markup', () => {
    expect(stripTags('<b>a</b><br />b')).toBe('a\nb')
  })

  it('unescapes the entities Wowhead emits', () => {
    expect(stripTags('&lt;3 &amp; &quot;x&quot;&nbsp;y')).toBe('<3 & "x" y')
  })
})

describe('tooltipLines and tooltipDescription', () => {
  it('return nothing when the shape is not there', () => {
    expect(tooltipLines('')).toEqual([])
    expect(tooltipLines('<div>no table</div>')).toEqual([])
    expect(tooltipDescription('<table><tr><td>x</td></tr></table>')).toBeUndefined()
  })

  it('accept a quality-suffixed description block', () => {
    expect(tooltipDescription('<div class="q2">graded</div>')).toBe('graded')
  })
})

describe('classifyLines', () => {
  it('recognises range and cast time in English', () => {
    expect(classifyLines(dismemberEn.lines)).toEqual({ 0: 'range', 1: 'castTime' })
  })

  it('recognises an instant cast and a channel', () => {
    expect(classifyLines(['Instant'])).toEqual({ 0: 'castTime' })
    expect(classifyLines(['Channeled (1 min cast)'])).toEqual({ 0: 'castTime' })
  })

  it('leaves a line it does not recognise unclassified', () => {
    expect(classifyLines(['Requires Warrior'])).toEqual({})
  })

  it('does NOT recognise the French wording — which is the whole point', () => {
    // If these matched, someone could believe per-language regexes work. They do not scale,
    // and the positional mapping below is what actually carries the translation.
    expect(classifyLines(dismemberFr.lines)).toEqual({})
    expect(classifyLines(fadeOutFr.lines)).toEqual({})
  })
})

describe('buildSpellText', () => {
  const entries = (en, fr) => [
    { lang: 'en', tooltip: en },
    { lang: 'fr', tooltip: fr },
  ]

  it('maps both fields across languages by position', () => {
    const { text } = buildSpellText(1306911, entries(dismemberEn, dismemberFr))
    expect(text.en).toMatchObject({
      name: 'Dismember',
      range: 'Unlimited range',
      castTime: '3 sec cast',
    })
    expect(text.fr).toMatchObject({
      name: 'Démembrer',
      range: 'Portée illimitée',
      castTime: "3 s d'incantation",
    })
  })

  it('places a French line the English patterns cannot match', () => {
    // "Instantanée" fails /^instant$/i. Only the positional mapping puts it in castTime.
    const { text } = buildSpellText(5543, entries(fadeOutEn, fadeOutFr))
    expect(text.en.castTime).toBe('Instant')
    expect(text.fr.castTime).toBe('Instantanée')
    expect(text.fr.range).toBeUndefined()
  })

  it('translates the description too, not just the name', () => {
    const { text } = buildSpellText(5543, entries(fadeOutEn, fadeOutFr))
    expect(text.fr.description).toBe('Rend le lanceur de sorts invisible pendant 2 s.')
  })

  it('keeps the icon out of the per-language block: it does not depend on language', () => {
    const built = buildSpellText(1306911, entries(dismemberEn, dismemberFr))
    expect(built.icon).toBe('ability_criticalstrike')
    expect(built.text.en.icon).toBeUndefined()
  })

  it('warns and carries on when a secondary locale is missing', () => {
    const { text, warnings } = buildSpellText(5543, entries(fadeOutEn, null))
    expect(text.en).toBeDefined()
    expect(text.fr).toBeUndefined()
    expect(warnings).toEqual(['5543: no fr tooltip'])
  })

  it('gives up entirely when the base language is missing', () => {
    // Without the base pass there is no layout, so nothing can be placed for anyone.
    expect(buildSpellText(5543, entries(null, fadeOutFr))).toBeNull()
  })

  it('refuses to guess when the two headers have different shapes', () => {
    // Never observed across the 875 spells of the pool, but the day it happens the mapping
    // is meaningless — so keep the name and description, drop the rest, and say so.
    const { text, warnings } = buildSpellText(1306911, entries(dismemberEn, fadeOutFr))
    expect(text.fr).toEqual({
      name: 'Disparaître',
      description: 'Rend le lanceur de sorts invisible pendant 2 s.',
    })
    expect(text.fr.castTime).toBeUndefined()
    expect(warnings[0]).toContain('1 lines against 2')
  })

  it('reports no warning when everything lines up', () => {
    expect(buildSpellText(1306911, entries(dismemberEn, dismemberFr)).warnings).toEqual([])
  })
})

describe('buildText', () => {
  it('omits a field whose line is absent rather than emitting undefined', () => {
    const text = buildText({ name: 'X', lines: ['only'] }, { 0: 'range', 1: 'castTime' })
    expect(text).toEqual({ name: 'X', range: 'only' })
    expect('castTime' in text).toBe(false)
  })

  it('omits the description when there is none', () => {
    expect('description' in buildText({ name: 'X', lines: [] }, {})).toBe(false)
  })
})
