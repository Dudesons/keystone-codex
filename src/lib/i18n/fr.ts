// ABOUTME: The French dictionary, typed against English so tsc fails on a missing or extra key.
// ABOUTME: Holds no game term — those are localized by the pipeline, never written here.

/**
 * French dictionary. Typed as `Dictionary`, so a missing or surplus key fails `tsc`.
 *
 * Game terms (mob names, spell names and descriptions) never appear here — they come from
 * the MDT and Wowhead pipeline, localised at extraction time.
 */

import type { Dictionary } from './en'

export const fr: Dictionary = {
  // Shared across panels
  'common.back': '← Retour',
  'common.close': 'Fermer',
  'common.delete': 'Supprimer',
  'common.forces.one': '{n} force',
  'common.forces.other': '{n} forces',
  'common.noForce': 'aucune force',
  'common.units.one': '{n} unité',
  'common.units.other': '{n} unités',
  'common.packs.one': '{n} pack',
  'common.packs.other': '{n} packs',
  'common.minutes': '{n} min',

  // Language switcher
  'locale.label': 'Langue',
  'locale.en': 'EN',
  'locale.fr': 'FR',

  // Home
  'home.eyebrow': 'MIDNIGHT · SAISON 2',
  'home.title': 'Codex Mythique+',
  'home.intro':
    'Les {n} donjons du pool, leurs packs et leurs pièges. Clique un donjon pour ouvrir sa carte et son codex, importer une route MDT ou en construire une.',
  'home.bosses.one': '{n} boss',
  'home.bosses.other': '{n} boss',
  'home.cards': '{written}/{total} fiches',
  'home.footer':
    'Données de mobs et cartes extraites de Mythic Dungeon Tools. Descriptions et pièges à éditer dans',

  // Dungeon page
  'dungeon.unknown': 'Donjon inconnu.',
  'dungeon.backHome': 'Retour à l’accueil',
  'dungeon.route': 'route « {name} »',
  'tab.codex': 'Codex',
  'tab.route': 'Route',

  // Codex panel
  'codex.pack': 'Pack {n}',
  'codex.inThisPack': '×{n} dans ce pack',
  'codex.bosses': 'BOSS',
  'codex.trash': 'TRASH · {n} mobs',

  // Mob card
  'mob.boss': 'BOSS',
  'mob.pull': 'Pull {n}',
  'mob.trap': 'LE PIÈGE',
  'mob.ccApplicable': 'CC APPLICABLES',
  'mob.ccImmune': 'Immunisé à tous les CC listés par MDT.',
  'mob.unknownSpell': 'Sort {id}',

  // Threat levels — the ring on the map, the badge on the card
  'threat.low': 'Sans danger',
  'threat.medium': 'À surveiller',
  'threat.high': 'Dangereux',
  'threat.lethal': 'Létal',

  // Roles — a closed vocabulary of the written entry, like the threat level
  'role.caster': 'Caster',
  'role.melee': 'Mêlée',
  'role.patrol': 'Patrouille',
  'role.miniboss': 'Miniboss',
  'role.add': 'Add de rencontre',

  // Spell tags
  'tag.kick': 'KICK',
  'tag.dodge': 'ESQUIVE',
  'tag.dispel': 'DISPEL',
  'tag.tank': 'TANK',
  'tag.soak': 'SOAK',
  'tag.ignore': 'IGNORER',
  'tag.todo': '—',

  // Map HUD and legend
  'map.legend': 'Légende',
  'map.zoomIn': 'Zoomer',
  'map.zoomOut': 'Dézoomer',
  'map.fit': 'Recadrer',
  'map.boss': 'boss',
  'map.pack': 'pack {g} ({n})',
  'map.patrol': 'patrouille',
  'map.toKick': 'à kick',
  'map.tankBuster': 'tank buster',
  'map.trapDocumented': 'piège documenté',
  'map.badgeKick': 'À interrompre',
  'map.badgeTank': 'Tank buster',
  'map.badgeDispel': 'Dispel',
  'legend.pips': 'PASTILLES',
  'legend.ring': 'ANNEAU',
  'legend.kick': 'Sort à interrompre (source MDT)',
  'legend.tank': 'Tank buster (déclaré dans la fiche)',
  'legend.dispel': 'Sort dissipable (source MDT)',
  'legend.ring.lethal': 'Menace létale',
  'legend.ring.high': 'Dangereux',
  'legend.ring.medium': 'À surveiller',
  'legend.ring.low': 'Sans danger',
  'legend.ring.boss': 'Boss',
  'legend.ring.unknown': 'Menace non renseignée',

  // Route panel
  'route.namePlaceholder': 'Nom de la route',
  'route.forces': 'Forces',
  'route.copy': 'Copier la string MDT',
  'route.addPull': '+ Pull',
  'route.pulls': 'PULLS · {n}',
  'route.emptyPull': 'vide — clique un pack sur la carte',
  'route.briefing': '▸ Briefing',
  'route.hide': '▾ Masquer',
  'route.moveUp': 'Monter',
  'route.moveDown': 'Descendre',
  'route.hint':
    'Clique un pack sur la carte pour l’ajouter au pull sélectionné. Ctrl+clic ne vise qu’un seul mob. Cliquer à nouveau retire.',
  'route.import': 'IMPORTER',
  'route.importPlaceholder': 'Colle ici une string MDT (!~MDT2~… ou format legacy)',
  'route.importAction': 'Importer',
  'route.clear': 'Vider',
  'route.prio': 'PRIO',
  'route.kickList': 'kick : {spells}',
  'route.copied': 'String MDT copiée. Colle-la dans MDT en jeu (Import).',
  'route.codeCopied': 'Code de session copié.',
  'route.wrongDungeon': 'Cette route est pour {dungeon}, pas pour ce donjon.',
  'route.imported.one': '« {name} » importée : {n} pull.',
  'route.imported.other': '« {name} » importée : {n} pulls.',

  // Collaborative editing
  'collab.heading': 'SESSION PARTAGÉE',
  'collab.connecting': 'connexion…',
  'collab.connected.one': '{n} connecté',
  'collab.connected.other': '{n} connectés',
  'collab.copyCode': 'Copier le code',
  'collab.leave': 'Quitter',
  'collab.editTogether': 'ÉDITER À PLUSIEURS',
  'collab.openSession': 'Ouvrir une session avec cette route',
  'collab.codePlaceholder': 'CODE',
  'collab.join': 'Rejoindre',
  'collab.hint':
    'La route est synchronisée en direct via un relais. Rejoindre laisse ta route locale de côté et prend celle du salon.',

  // MDT import errors addressed to the user
  'mdtError.noValue': 'Preset MDT invalide : champ « value » absent.',
  'mdtError.notInPool':
    'Ce donjon (index MDT {mdtIndex}) n’est pas dans le pool de la saison 2 — route non importable ici.',
  'mdtError.emptyString': 'String vide.',
  'mdtError.unknownFormat':
    'Format non reconnu. Colle une string exportée par MDT (elle commence par « !~MDT2~ » ou « ! »).',
}
