import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseDungeon } from './mdt-dungeon.mjs'
import {
  buildDungeonStub,
  buildMobStub,
  mobFileName,
  scaffoldPlan,
  spellText,
  yamlString,
} from './content-stub.mjs'

/** The same committed MDT file the extraction tests use — see __fixtures__/README.md. */
const dungeon = parseDungeon(
  fs.readFileSync(fileURLToPath(new URL('./__fixtures__/AltarOfFangs.lua', import.meta.url)), 'utf8'),
  'AltarOfFangs',
  () => {},
)

/** A spell table of the shape fetch-assets writes. Data, not a stand-in for behaviour. */
const spells = {
  1306911: {
    id: 1306911,
    icon: 'ability_criticalstrike',
    text: {
      en: { name: 'Dismember', range: 'Unlimited range', castTime: '3 sec cast' },
      fr: { name: 'Démembrer' },
    },
  },
}

const chieftain = dungeon.enemies.find((e) => e.id === 270306)
const nothingExists = () => false

describe('mobFileName', () => {
  it('pairs the npcId with a slug, so the file sorts and greps by id', () => {
    expect(mobFileName({ id: 270306, name: 'Ritual Chieftain' })).toBe('270306-ritual-chieftain.md')
  })

  it('drops apostrophes rather than turning them into separators', () => {
    // "Rav'i" must not become "rav-i".
    expect(mobFileName({ id: 1, name: "Rav'i" })).toBe('1-ravi.md')
    expect(mobFileName({ id: 2, name: 'Xal’atath' })).toBe('2-xalatath.md')
  })

  it('collapses everything else into single dashes', () => {
    expect(mobFileName({ id: 3, name: 'A  B — C!' })).toBe('3-a-b-c.md')
  })

  it('falls back to `mob` when a name slugifies to nothing', () => {
    expect(mobFileName({ id: 4, name: '???' })).toBe('4-mob.md')
  })
})

describe('yamlString', () => {
  it('escapes what would break a double-quoted scalar', () => {
    expect(yamlString('King\'s Rest')).toBe('"King\'s Rest"')
    expect(yamlString('say "hi"')).toBe('"say \\"hi\\""')
    expect(yamlString('a\\b')).toBe('"a\\\\b"')
  })
})

describe('spellText', () => {
  it('reads the base language, whatever else the entry carries', () => {
    expect(spellText(spells, 1306911).name).toBe('Dismember')
  })

  it('returns nothing for a spell it does not know', () => {
    expect(spellText(spells, 999)).toBeUndefined()
    expect(spellText({}, 1306911)).toBeUndefined()
  })
})

describe('buildMobStub', () => {
  const stub = buildMobStub(chieftain, spells)

  it('pre-fills what is mechanical', () => {
    expect(stub).toContain(`npcId: ${chieftain.id}`)
    expect(stub).toContain('name: "Ritual Chieftain"   # auto')
    expect(stub).toContain(`count: ${chieftain.count}`)
  })

  it('leaves blank exactly what takes human judgement', () => {
    // The value must be empty: a default would be a judgement nobody made.
    expect(stub).toMatch(/^threat:$/m)
    expect(stub).toMatch(/^role:$/m)
    expect(stub).toMatch(/^trap:$/m)
  })

  it('tags every spell `todo`, which does not count as written', () => {
    const tags = stub.match(/^ {4}tag: \w+$/gm) ?? []
    expect(tags.length).toBe(chieftain.spells.length)
    expect(tags.every((t) => t.endsWith('todo'))).toBe(true)
  })

  it('quotes the spell name and its facts as a comment, not as data', () => {
    expect(stub).toContain('    name: "Dismember"   # auto')
    expect(stub).toContain('    # 3 sec cast · Unlimited range')
  })

  it('omits the name line for a spell it cannot resolve', () => {
    const unknown = { ...chieftain, id: 1, spells: [{ id: 999 }], cc: [] }
    const out = buildMobStub(unknown, spells)
    expect(out).toContain('  - id: 999')
    expect(out).not.toContain('name: "Dismember"')
  })

  it('records the dispel type MDT declares', () => {
    const withDispel = { ...chieftain, id: 2, spells: [{ id: 999, dispel: ['magic', 'curse'] }] }
    expect(buildMobStub(withDispel, spells)).toContain('dispel: magic/curse')
  })

  it('marks bosses and says nothing for the others', () => {
    const boss = dungeon.enemies.find((e) => e.isBoss)
    expect(buildMobStub(boss, spells)).toContain('isBoss: true')
    expect(buildMobStub(chieftain, spells)).not.toContain('isBoss')
  })

  it('lists applicable crowd control, and omits the line when there is none', () => {
    const immune = { ...chieftain, cc: [] }
    const controllable = { ...chieftain, cc: ['Stun', 'Fear'] }
    expect(buildMobStub(immune, spells)).not.toContain('Applicable CC')
    expect(buildMobStub(controllable, spells)).toContain('Applicable CC (auto, from MDT): Stun, Fear')
  })

  it('produces frontmatter the content loader can parse', () => {
    expect(stub.startsWith('---\n')).toBe(true)
    expect(stub.match(/^---$/gm)).toHaveLength(2)
  })

  it('counts as a stub, not as a written card', () => {
    // Mirrors the isStub rule in lib/content.ts: no prose, no trap, no threat, no real tag.
    const body = stub.split(/^---$/m)[2].replace(/<!--[\s\S]*?-->/g, '').trim()
    expect(body).toBe('')
  })
})

describe('buildDungeonStub', () => {
  it('pre-fills the known M+ timers and flags the unknown ones', () => {
    expect(buildDungeonStub({ slug: 'murder-row', englishName: 'Murder Row' })).toContain('timer: 34')
    const unknown = buildDungeonStub({ slug: 'altar-of-fangs', englishName: 'Altar of Fangs' })
    expect(unknown).toMatch(/^timer:$/m)
    expect(unknown).toContain('TO FILL IN')
  })

  it('lays out the sections a route plan needs', () => {
    const stub = buildDungeonStub(dungeon)
    expect(stub).toContain('## Route plan')
    expect(stub).toContain('## Affixes')
  })
})

describe('scaffoldPlan', () => {
  it('writes one card per distinct npcId, not per MDT entry', () => {
    // A mob appearing twice in dungeonEnemies as a variant shares its card.
    const plan = scaffoldPlan(dungeon, spells, nothingExists)
    const distinct = new Set(dungeon.enemies.map((e) => e.id)).size
    expect(plan.mobs).toBe(distinct)
    expect(plan.create).toHaveLength(distinct + 1) // + _dungeon.md
  })

  it('adds the dungeon card alongside the mobs', () => {
    const plan = scaffoldPlan(dungeon, spells, nothingExists)
    expect(plan.create.map((f) => f.name)).toContain('_dungeon.md')
  })

  it('NEVER rebuilds a card that already exists', () => {
    // The one thing in this repository that cannot be regenerated is someone's judgement.
    const plan = scaffoldPlan(dungeon, spells, () => true)
    expect(plan.create).toEqual([])
    expect(plan.kept).toBe(plan.mobs + 1)
  })

  it('adds only what is missing when the folder is half filled', () => {
    const existing = new Set(['_dungeon.md', mobFileName(chieftain)])
    const plan = scaffoldPlan(dungeon, spells, (name) => existing.has(name))
    expect(plan.kept).toBe(2)
    expect(plan.create.map((f) => f.name)).not.toContain('_dungeon.md')
    expect(plan.create.map((f) => f.name)).not.toContain(mobFileName(chieftain))
    expect(plan.create).toHaveLength(plan.mobs - 1)
  })

  it('asks about the names it is about to write, and nothing else', () => {
    const asked = []
    scaffoldPlan(dungeon, spells, (name) => (asked.push(name), false))
    const written = scaffoldPlan(dungeon, spells, nothingExists).create.map((f) => f.name)
    expect(asked).toEqual(written)
  })

  it('gives every planned file content', () => {
    for (const file of scaffoldPlan(dungeon, spells, nothingExists).create) {
      expect(file.content.length, file.name).toBeGreaterThan(0)
      expect(file.name.endsWith('.md'), file.name).toBe(true)
    }
  })
})
