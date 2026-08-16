/**
 * The reference dictionary. Every other language is typed against it, so `tsc` fails on any
 * key that is missing or left over — that check replaces a completeness test.
 *
 * Game terms are absent on purpose: mob names come from MDT, spell names and descriptions
 * from Wowhead. Writing a translation of either here would be a bug.
 */

export const en = {
  // Shared across panels
  'common.back': '← Back',
  'common.close': 'Close',
  'common.delete': 'Delete',
  'common.forces.one': '{n} force',
  'common.forces.other': '{n} forces',
  'common.noForce': 'no forces',
  'common.units.one': '{n} unit',
  'common.units.other': '{n} units',
  'common.packs.one': '{n} pack',
  'common.packs.other': '{n} packs',
  'common.minutes': '{n} min',

  // Language switcher
  'locale.label': 'Language',
  'locale.en': 'EN',
  'locale.fr': 'FR',

  // Home
  'home.eyebrow': 'MIDNIGHT · SEASON 2',
  'home.title': 'Mythic+ Codex',
  'home.intro':
    'The {n} dungeons of the pool, their packs and their traps. Click a dungeon to open its map and its codex, import an MDT route or build one.',
  'home.bosses.one': '{n} boss',
  'home.bosses.other': '{n} bosses',
  'home.cards': '{written}/{total} cards',
  'home.footer':
    'Mob data and maps extracted from Mythic Dungeon Tools. Descriptions and traps are edited in',

  // Dungeon page
  'dungeon.unknown': 'Unknown dungeon.',
  'dungeon.backHome': 'Back to home',
  'dungeon.route': 'route “{name}”',
  'tab.codex': 'Codex',
  'tab.route': 'Route',

  // Codex panel
  'codex.pack': 'Pack {n}',
  'codex.inThisPack': '×{n} in this pack',
  'codex.bosses': 'BOSSES',
  'codex.trash': 'TRASH · {n} mobs',

  // Mob card
  'mob.boss': 'BOSS',
  'mob.pull': 'Pull {n}',
  'mob.trap': 'THE TRAP',
  'mob.ccApplicable': 'APPLICABLE CC',
  'mob.ccImmune': 'Immune to every CC listed by MDT.',
  'mob.unknownSpell': 'Spell {id}',

  // Threat levels — the ring on the map, the badge on the card
  'threat.low': 'Harmless',
  'threat.medium': 'Watch out',
  'threat.high': 'Dangerous',
  'threat.lethal': 'Lethal',

  // Spell tags
  'tag.kick': 'KICK',
  'tag.dodge': 'DODGE',
  'tag.dispel': 'DISPEL',
  'tag.tank': 'TANK',
  'tag.soak': 'SOAK',
  'tag.ignore': 'IGNORE',
  'tag.todo': '—',

  // Map HUD and legend
  'map.legend': 'Legend',
  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',
  'map.fit': 'Fit',
  'map.boss': 'boss',
  'map.pack': 'pack {g} ({n})',
  'map.patrol': 'patrol',
  'map.toKick': 'to kick',
  'map.tankBuster': 'tank buster',
  'map.trapDocumented': 'documented trap',
  'map.badgeKick': 'To interrupt',
  'map.badgeTank': 'Tank buster',
  'map.badgeDispel': 'Dispel',
  'legend.pips': 'PIPS',
  'legend.ring': 'RING',
  'legend.kick': 'Spell to interrupt (from MDT)',
  'legend.tank': 'Tank buster (declared in the card)',
  'legend.dispel': 'Dispellable spell (from MDT)',
  'legend.ring.lethal': 'Lethal threat',
  'legend.ring.high': 'Dangerous',
  'legend.ring.medium': 'Watch out',
  'legend.ring.low': 'Harmless',
  'legend.ring.boss': 'Boss',
  'legend.ring.unknown': 'Threat not assessed',

  // Route panel
  'route.namePlaceholder': 'Route name',
  'route.forces': 'Forces',
  'route.copy': 'Copy MDT string',
  'route.addPull': '+ Pull',
  'route.pulls': 'PULLS · {n}',
  'route.emptyPull': 'empty — click a pack on the map',
  'route.briefing': '▸ Briefing',
  'route.hide': '▾ Hide',
  'route.moveUp': 'Move up',
  'route.moveDown': 'Move down',
  'route.hint':
    'Click a pack on the map to add it to the selected pull. Ctrl+click targets a single mob. Clicking again removes it.',
  'route.import': 'IMPORT',
  'route.importPlaceholder': 'Paste an MDT string here (!~MDT2~… or legacy format)',
  'route.importAction': 'Import',
  'route.clear': 'Clear',
  'route.prio': 'PRIO',
  'route.kickList': 'kick: {spells}',
  'route.copied': 'MDT string copied. Paste it into MDT in game (Import).',
  'route.codeCopied': 'Session code copied.',
  'route.wrongDungeon': 'That route is for {dungeon}, not for this one.',
  'route.imported.one': '“{name}” imported: {n} pull.',
  'route.imported.other': '“{name}” imported: {n} pulls.',

  // Collaborative editing
  'collab.heading': 'SHARED SESSION',
  'collab.connecting': 'connecting…',
  'collab.connected.one': '{n} connected',
  'collab.connected.other': '{n} connected',
  'collab.copyCode': 'Copy the code',
  'collab.leave': 'Leave',
  'collab.editTogether': 'EDIT TOGETHER',
  'collab.openSession': 'Open a session with this route',
  'collab.codePlaceholder': 'CODE',
  'collab.join': 'Join',
  'collab.hint':
    'Peer-to-peer, no server: the route syncs live between browsers. Joining replaces your local route with the room’s.',

  // MDT import errors addressed to the user. The codec's diagnostic errors stay in English
  // in the code and are surfaced as-is: whoever sees one is opening a ticket anyway.
  'mdtError.noValue': 'Invalid MDT preset: no “value” field.',
  'mdtError.notInPool':
    'This dungeon (MDT index {mdtIndex}) is not in the season 2 pool — the route cannot be imported here.',
  'mdtError.emptyString': 'Empty string.',
  'mdtError.unknownFormat':
    'Unrecognised format. Paste a string exported by MDT (it starts with “!~MDT2~” or “!”).',
} as const

export type TranslationKey = keyof typeof en

export type Dictionary = Record<TranslationKey, string>

type BaseOf<K, Suffix extends string> = K extends `${infer B}.${Suffix}` ? B : never

/** Keys that exist in both a `.one` and a `.other` variant, the only ones `plural()` takes. */
export type PluralKey = Extract<BaseOf<TranslationKey, 'one'>, BaseOf<TranslationKey, 'other'>>
