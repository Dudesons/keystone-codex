// ABOUTME: The reference dictionary of UI strings, and the key types derived from it.
// ABOUTME: Holds no game term: mob and spell names come from the MDT and Wowhead pipeline.

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
  'mob.ccUnknown': 'MDT has no CC data for this dungeon.',
  'mob.unknownSpell': 'Spell {id}',

  // Threat levels — the ring on the map, the badge on the card
  'threat.low': 'Harmless',
  'threat.medium': 'Watch out',
  'threat.high': 'Dangerous',
  'threat.lethal': 'Lethal',

  // Roles — a closed vocabulary of the written entry, like the threat level
  'role.caster': 'Caster',
  'role.melee': 'Melee',
  'role.patrol': 'Patrol',
  'role.miniboss': 'Miniboss',
  'role.add': 'Encounter add',

  // Spell tags
  'tag.kick': 'KICK',
  'tag.frontal': 'FRONTAL',
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
  'map.badgeFrontal': 'Frontal',
  'map.badgeTank': 'Tank buster',
  'map.badgeDispel': 'Dispel',
  'map.item': 'usable item',
  'map.dungeonEntrance': 'Dungeon entrance',
  'map.note': 'note',
  'legend.pips': 'PIPS',
  'legend.ring': 'RING',
  'legend.kick': 'Spell to interrupt (from MDT)',
  'legend.frontal': 'Frontal cone (declared in the card)',
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
  'route.frontalList': 'frontal: {spells}',
  'route.copied': 'MDT string copied. Paste it into MDT in game (Import).',
  'route.codeCopied': 'Session code copied.',
  'route.linkCopied': 'Session link copied.',
  'route.wrongDungeon': 'That route is for {dungeon}, not for this one.',
  'route.imported.one': '“{name}” imported: {n} pull.',
  'route.imported.other': '“{name}” imported: {n} pulls.',

  // Collaborative editing
  'collab.heading': 'SHARED SESSION',
  'collab.connecting': 'connecting…',
  'collab.connected.one': '{n} connected',
  'collab.connected.other': '{n} connected',
  'collab.copyCode': 'Copy the code',
  'collab.copyLink': 'Copy the link',
  'collab.leave': 'Leave',
  'collab.editTogether': 'EDIT TOGETHER',
  'collab.openSession': 'Open a session with this route',
  'collab.codePlaceholder': 'CODE',
  'collab.join': 'Join',
  'collab.invitation': 'Join room {room} — your local route will be set aside.',
  'collab.acceptInvitation': 'Join room {room}',
  'collab.name': 'Your name',
  'collab.namePlaceholder': 'Name',
  'collab.hint':
    'The route syncs live through a relay. Joining sets your local route aside and gives it back when you leave.',
  'collab.relayStalled': 'The relay is not answering. Your local route is safe.',
  'collab.awaitingRoom': 'Fetching the room’s route…',
  'collab.paused': 'paused — nobody was here',
  'collab.resume': 'Return to the room',

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
