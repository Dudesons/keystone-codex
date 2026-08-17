// ABOUTME: Tests the tooltip parsing against captured Wowhead responses in two languages.
// ABOUTME: Pins that classifyLines does NOT match the French wording — position alone places it.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  buildNpcText,
  buildSpellText,
  buildText,
  classifyLines,
  classifyNpcLines,
  parseNpcTooltip,
  parseTooltip,
  stripTags,
  tooltipDescription,
  tooltipLines,
  unfetchedLocales,
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

const chieftainEn = parseNpcTooltip(fixture('npc-ritual-chieftain.en'))
const chieftainFr = parseNpcTooltip(fixture('npc-ritual-chieftain.fr'))
const raviEn = parseNpcTooltip(fixture('npc-ravi.en'))
const eggsEn = parseNpcTooltip(fixture('npc-infused-eggs.en'))
const eggsFr = parseNpcTooltip(fixture('npc-infused-eggs.fr'))
const twinfangEn = parseNpcTooltip(fixture('npc-twinfang-harrower.en'))
const twinfangFr = parseNpcTooltip(fixture('npc-twinfang-harrower.fr'))
const belathEn = parseNpcTooltip(fixture('npc-belath-dawnblade.en'))
const belathFr = parseNpcTooltip(fixture('npc-belath-dawnblade.fr'))
const zuljarraEn = parseNpcTooltip(fixture('npc-zuljarra.en'))
const zuljarraFr = parseNpcTooltip(fixture('npc-zuljarra.fr'))

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

describe('unfetchedLocales', () => {
  const cache = {
    1: { id: 1, icon: 'a', text: { en: { name: 'Dismember' }, fr: { name: 'Démembrer' } } },
    2: { id: 2, icon: 'b', text: { en: { name: 'Enrage' } } },
  }

  it('says nothing when every configured language is present somewhere', () => {
    expect(unfetchedLocales(cache, ['en', 'fr'])).toEqual([])
  })

  it('names a language the cache has never heard of', () => {
    // The case that matters: someone adds `de` to WOWHEAD_LOCALES. Without this, the run
    // reports "0 to fetch", exits happy, and the app silently falls back to English.
    expect(unfetchedLocales(cache, ['en', 'fr', 'de'])).toEqual(['de'])
  })

  it('is not fooled by a language Wowhead simply lacks for one spell', () => {
    // Spell 2 has no French label, and that is legitimate — Wowhead does not translate
    // everything. One entry carrying it is enough to prove the pass ran.
    expect(unfetchedLocales(cache, ['fr'])).toEqual([])
  })

  it('reports an empty cache as missing every language, not as complete', () => {
    expect(unfetchedLocales({}, ['en', 'fr'])).toEqual(['en', 'fr'])
  })
})


describe('parseNpcTooltip', () => {
  it('reads the name and the header lines, name excluded', () => {
    expect(chieftainEn).toEqual({ name: 'Ritual Chieftain', lines: ['Humanoid (Elite)'] })
    expect(chieftainFr).toEqual({ name: 'Chef du rituel', lines: ['Humanoïde (Élite)'] })
  })

  it('separates rows Wowhead runs together with no newline between them', () => {
    // Twinfang Harrower's family sits in its own <tr> but on the same text line, so the rows
    // have to be read from the markup rather than from Wowhead's whitespace.
    expect(twinfangEn.lines).toEqual(['Beast (Elite)', 'Chimaera'])
    expect(twinfangFr.lines).toEqual(['Bête (Élite)', 'Chimère'])
  })

  it('skips the portrait row a boss tooltip opens with', () => {
    // Rav'i's first row holds the dungeon-journal image and no text at all.
    expect(raviEn).toEqual({ name: "Rav'i", lines: ['Beast (Elite)'] })
  })

  it('keeps the title above the classification and the reaction below it', () => {
    expect(belathEn.lines).toEqual(['Illidari', 'Level 82 - 90 Humanoid (Normal)', 'Illidari'])
    expect(zuljarraEn.lines).toEqual(['Level ?? Humanoid (Elite)', 'Friendly'])
  })

  it('gives up on a response with no name', () => {
    expect(parseNpcTooltip({})).toBeNull()
    expect(parseNpcTooltip(null)).toBeNull()
  })

  it('survives a response carrying no tooltip HTML at all', () => {
    expect(parseNpcTooltip({ name: 'Bare' })).toEqual({ name: 'Bare', lines: [] })
  })
})

describe('classifyNpcLines', () => {
  it('picks the parenthesised line out of however many the creature has', () => {
    expect(classifyNpcLines(chieftainEn.lines)).toBe(0)
    expect(classifyNpcLines(twinfangEn.lines)).toBe(0)
    expect(classifyNpcLines(belathEn.lines)).toBe(1)
    expect(classifyNpcLines(zuljarraEn.lines)).toBe(0)
  })

  it('says so when no line carries a classification', () => {
    expect(classifyNpcLines([])).toBe(-1)
    expect(classifyNpcLines(['Illidari'])).toBe(-1)
  })
})

describe('buildNpcText', () => {
  const entries = (en, fr) => [
    { lang: 'en', tooltip: en },
    { lang: 'fr', tooltip: fr },
  ]

  it('translates the name and the creature type together', () => {
    const { text } = buildNpcText(270306, 'Ritual Chieftain', entries(chieftainEn, chieftainFr))
    expect(text.en).toEqual({ name: 'Ritual Chieftain', type: 'Humanoid' })
    expect(text.fr).toEqual({ name: 'Chef du rituel', type: 'Humanoïde' })
  })

  it('takes the line English put the classification on, not one French happens to match', () => {
    // Belath's classification is the second of three lines, under a title. Anything that
    // looked for the first parenthesised line in French would land there by luck, not design.
    const { text } = buildNpcText(263940, 'Belath Dawnblade', entries(belathEn, belathFr))
    expect(text.en.type).toBe('Humanoid')
    expect(text.fr.type).toBe('Humanoïde')
  })

  it('drops a level prefix, whether it is a range or unknowable', () => {
    // "Level 82 - 90" and "Niveau 82 - 90", "Level ??" and "Niveau ??": the prefix ends at
    // its last digit, so it needs no rule per language.
    expect(buildNpcText(263940, 'Belath', entries(belathEn, belathFr)).text.fr.type).toBe('Humanoïde')
    expect(buildNpcText(246409, "Zul'jarra", entries(zuljarraEn, zuljarraFr)).text.fr.type).toBe('Humanoïde')
  })

  it('ignores the creature family, which is a line of its own', () => {
    const { text } = buildNpcText(261554, 'Twinfang Harrower', entries(twinfangEn, twinfangFr))
    expect(text.en.type).toBe('Beast')
    expect(text.fr.type).toBe('Bête')
  })

  it('omits the type rather than emitting undefined when Wowhead names none', () => {
    // Infused Eggs render as " (Normal)": a classification with nothing in front of it.
    const { text } = buildNpcText(264798, 'Infused Eggs', entries(eggsEn, eggsFr))
    expect(text.en).toEqual({ name: 'Infused Eggs' })
    expect('type' in text.fr).toBe(false)
  })

  it('keeps MDT as the authority on the English name', () => {
    // MDT's name is the identity every content file, note and test is keyed on. Wowhead's
    // English is a check on the id, never a source that may quietly rename a mob.
    const { text, warnings } = buildNpcText(270306, 'Ritual Chieftain', entries(chieftainEn, chieftainFr))
    expect(text.en.name).toBe('Ritual Chieftain')
    expect(warnings).toEqual([])
  })

  it('warns rather than renaming when Wowhead disagrees about the English name', () => {
    const { text, warnings } = buildNpcText(270306, 'Ritual Cheiftain', entries(chieftainEn, chieftainFr))
    expect(text.en.name).toBe('Ritual Cheiftain')
    expect(warnings).toEqual([
      '270306: MDT calls it "Ritual Cheiftain", Wowhead "Ritual Chieftain" — check the id',
    ])
  })

  it('refuses to guess when the two headers have different shapes', () => {
    // The index only means anything if both headers hold the same lines. Keep the name,
    // drop the type, and say so — exactly what buildSpellText does.
    const { text, warnings } = buildNpcText(263940, 'Belath Dawnblade', entries(belathEn, chieftainFr))
    expect(text.fr).toEqual({ name: 'Chef du rituel' })
    expect(warnings[0]).toContain('1 lines against 3')
  })

  it('warns and carries on when a secondary locale is missing', () => {
    const { text, warnings } = buildNpcText(270306, 'Ritual Chieftain', entries(chieftainEn, null))
    expect(text.en).toBeDefined()
    expect(text.fr).toBeUndefined()
    expect(warnings).toEqual(['270306: no fr tooltip'])
  })

  it('gives up entirely when the base language is missing', () => {
    expect(buildNpcText(270306, 'Ritual Chieftain', entries(null, chieftainFr))).toBeNull()
  })
})
