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

  'credits.mdt':
    'Données de mobs, packs, forces et cartes issues de Mythic Dungeon Tools {version}.',
  'credits.wowhead':
    'Noms de sorts et de créatures, icônes et descriptions récupérés via Wowhead.',
  'credits.cards':
    'Les fiches — menaces, pièges, notes de sorts et astuces — sont écrites à la main, dans content/.',
  'credits.blizzard':
    'Le matériel World of Warcraft appartient à Blizzard Entertainment. Ce projet n’est ni affilié à Blizzard Entertainment ni approuvé par lui.',
  'credits.blizzardShort': 'Le matériel World of Warcraft appartient à Blizzard Entertainment.',
  'credits.link.licence': 'GPL-2.0',
  'credits.link.source': 'Code source',
  'credits.link.contribute': 'Contribuer',
  'credits.sources': 'SOURCES',

  // Dungeon page
  'dungeon.unknown': 'Donjon inconnu.',
  'dungeon.backHome': 'Retour à l’accueil',
  'dungeon.route': 'route « {name} »',
  'tab.overview': 'Résumé',
  'tab.codex': 'Codex',
  'tab.route': 'Route',

  // Highlights page
  'highlights.mobs': 'MOBS À CONNAÎTRE',
  // Le piège d'un mob du tableau ci-dessus est passé sur sa ligne ; ce qui reste ici appartient
  // aux mobs écartés du tableau, d'où ce titre plutôt qu'une liste de tout.
  'highlights.traps': 'AUTRES PIÈGES',
  'highlights.tips': 'ASTUCES DES MOBS',
  'highlights.bosses': 'BOSS',
  'highlights.trap': 'Piège',

  // Codex panel
  'codex.pack': 'Pack {n}',
  'codex.inThisPack': '×{n} dans ce pack',
  'codex.bosses': 'BOSS',
  'codex.trash': 'TRASH · {n} mobs',

  // Mob card
  'mob.boss': 'BOSS',
  'mob.miniboss': 'MINIBOSS',
  'mob.pull': 'Pull {n}',
  'mob.trap': 'LE PIÈGE',
  'mob.ccApplicable': 'CC APPLICABLES',
  'mob.ccImmune': 'Immunisé à tous les CC listés par MDT.',
  'mob.ccUnknown': 'MDT n’a pas de données de CC pour ce donjon.',
  'mob.unknownSpell': 'Sort {id}',
  'mob.untranslated': 'Pas encore traduit',

  // Astuces
  'tip.section': 'ASTUCES',
  'tip.play': 'Lire la vidéo',
  'tip.collapse': 'Replier la vidéo',
  'tip.openOnYouTube': 'Ouvrir sur YouTube',
  'tip.jump': 'Contient des astuces — y aller',
  'tip.pack': 'Pack {g}',
  'tip.packs': 'Packs {list}',
  'tip.anywhere': 'Où qu\'il soit',
  'tip.showOnMap': 'Voir sur la carte',

  // Threat levels — the ring on the map, the badge on the card
  'threat.low': 'Sans danger',
  'threat.medium': 'À surveiller',
  'threat.high': 'Dangereux',
  'threat.lethal': 'Létal',

  // Roles — a closed vocabulary of the written entry, like the threat level
  'role.caster': 'Caster',
  'role.melee': 'Mêlée',
  'role.patrol': 'Patrouille',
  'role.add': 'Add de rencontre',

  // Spell tags
  'tag.kick': 'KICK',
  'tag.frontal': 'FRONTAL',
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
  'map.miniboss': 'miniboss',
  'map.pack': 'pack {g} ({n})',
  'map.patrol': 'patrouille',
  'map.toKick': 'à kick',
  'map.tankBuster': 'tank buster',
  'map.trapDocumented': 'piège documenté',
  'map.badgeKick': 'À interrompre',
  'map.badgeFrontal': 'Frontal',
  'map.badgeTank': 'Tank buster',
  'map.badgeDispel': 'Dispel',
  'map.badgeTips': 'Contient des astuces',
  'map.badgeTipsPull': 'Quelque chose d’écrit sur le pull {g}',
  'map.item': 'objet utilisable',
  'map.dungeonEntrance': 'Entrée du donjon',
  'map.note': 'note',
  'map.share': 'du donjon',
  'map.score': 'efficacité',
  'map.toolNote': 'Note',
  'map.toolArrow': 'Flèche',
  'map.toolFreehand': 'Dessiner',
  'map.toolSelect': 'Sélectionner',
  'map.toolErase': 'Effacer',
  'map.undo': 'Annuler',
  'map.redo': 'Rétablir',
  'map.colour': 'Couleur',
  'map.thickness': 'Épaisseur',
  'map.colourRed': 'Rouge',
  'map.colourOrange': 'Orange',
  'map.colourYellow': 'Jaune',
  'map.colourGreen': 'Vert',
  'map.colourBlue': 'Bleu',
  'map.colourPurple': 'Violet',
  'map.colourPink': 'Rose',
  'map.colourWhite': 'Blanc',
  'map.sizeSmall': 'Fin',
  'map.sizeMedium': 'Moyen',
  'map.sizeLarge': 'Épais',
  'map.noteText': 'Texte de la note',
  'map.notePlaceHint': 'Clique sur la carte pour poser une note.',
  'legend.pips': 'PASTILLES',
  'legend.ring': 'ANNEAU',
  'legend.kick': 'Sort à interrompre (source MDT)',
  'legend.frontal': 'Cône frontal (déclaré dans la fiche)',
  'legend.tank': 'Tank buster (déclaré dans la fiche)',
  'legend.dispel': 'Sort dissipable (source MDT)',
  'legend.tips': 'Quelque chose d’écrit sur ce mob, ou sur ce pull',
  'legend.ring.lethal': 'Menace létale',
  'legend.ring.high': 'Dangereux',
  'legend.ring.medium': 'À surveiller',
  'legend.ring.low': 'Sans danger',
  'legend.ring.boss': 'Boss',
  'legend.ring.unknown': 'Menace non renseignée',
  'legend.blip': 'TAILLE DES PIONS',
  'legend.blip.boss': 'Boss',
  'legend.blip.miniboss': 'Miniboss',
  'legend.blip.trash': 'Tout le reste',

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
  'route.frontalList': 'frontal : {spells}',
  'route.copied': 'String MDT copiée. Colle-la dans MDT en jeu (Import).',
  'route.codeCopied': 'Code de session copié.',
  'route.linkCopied': 'Lien de session copié.',
  'route.copyRouteLink': 'Copier un lien vers cette route',
  'route.routeLinkCopied': 'Lien copié.',
  'route.routeLinkLong':
    'Lien copié, mais il fait {n} caractères — trop long pour un message Discord. Pour partager une route de cette taille, ouvrez plutôt une session.',
  'route.offerTitle': 'Une route partagée',
  'route.routeOffer': 'Ce lien contient une route. La charger remplacera la vôtre.',
  'route.acceptRoute': 'Charger cette route',
  'route.declineRoute': 'Garder la mienne',
  'route.imported.one': '« {name} » importée : {n} pull.',
  'route.imported.other': '« {name} » importée : {n} pulls.',
  'route.hoverAMob': 'Survole un mob sur la carte pour lire sa fiche. Clic droit pour la garder ici.',
  'route.unpin': 'Ne plus retenir ce mob',

  // Collaborative editing
  'collab.heading': 'SESSION PARTAGÉE',
  'collab.connecting': 'connexion…',
  'collab.connected.one': '{n} connecté',
  'collab.connected.other': '{n} connectés',
  'collab.copyCode': 'Copier le code',
  'collab.copyLink': 'Copier le lien',
  'collab.leave': 'Quitter',
  'collab.editTogether': 'ÉDITER À PLUSIEURS',
  'collab.openSession': 'Ouvrir une session avec cette route',
  'collab.codePlaceholder': 'CODE',
  'collab.join': 'Rejoindre',
  'collab.invitationTitle': 'Une session partagée',
  'collab.invitation': 'Rejoindre le salon {room} — ta route locale sera mise de côté.',
  'collab.acceptInvitation': 'Rejoindre le salon {room}',
  'collab.declineInvitation': 'Plus tard',
  'collab.name': 'Ton pseudo',
  'collab.namePlaceholder': 'Pseudo',
  'collab.hint':
    'La route est synchronisée en direct via un relais. Rejoindre met ta route locale de côté et te la rend quand tu quittes.',
  'collab.relayStalled': 'Le relais ne répond pas. Ta route locale est intacte.',
  'collab.awaitingRoom': 'Récupération de la route du salon…',
  'collab.paused': 'en pause — plus personne ici',
  'collab.resume': 'Revenir dans le salon',

  // Recherche
  'search.open': 'Rechercher',
  'search.label': 'Rechercher un mob ou un sort',
  'search.placeholder': 'Un mob, un sort, ou un identifiant',
  'search.viaSpell': 'lance {spell}',
  'search.empty': 'Rien ne correspond à « {query} »',
  'search.showing': '{shown} sur {total}',
  'search.hint': '↑↓ pour naviguer · Entrée pour ouvrir · Échap pour fermer',

  // MDT import errors addressed to the user
  'mdtError.noValue': 'Preset MDT invalide : champ « value » absent.',
  'mdtError.notInPool':
    'Ce donjon (index MDT {mdtIndex}) n’est pas dans le pool de la saison 2 — route non importable ici.',
  'mdtError.emptyString': 'String vide.',
  'mdtError.unknownFormat':
    'Format non reconnu. Colle une string exportée par MDT (elle commence par « !~MDT2~ » ou « ! »).',
  'mdtError.wrongDungeon':
    'Cette route concerne {dungeon}. Ouvre ce donjon pour l’importer — chargée ici, ses pulls pointeraient sur d’autres mobs.',
}
