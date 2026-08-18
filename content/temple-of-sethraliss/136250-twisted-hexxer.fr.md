---
npcId: 136250

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 268013
    note: "242k plus 78k par seconde pendant 8 s — environ 860k sur un joueur. Quatre secondes d'incantation, et la seule chose interruptible qu'il fait."
  - id: 1311964
    note: "31k par seconde pendant 4 s, puis 78k à tout le monde dans les 10 mètres à la fin. S'éloigner du groupe avant l'expiration."
  - id: 1300684
    note: "Transforme en grenouille les joueurs qui s'y tiennent — plus d'attaque, plus d'incantation — et inflige 97k toutes les 2 s. Un morceau de sol qui retire les joueurs du combat."
  - id: 1300666
    note: "MDT enregistre ce sort sans nom et sans texte d'infobulle. On ne peut rien en dire."

trap: "**Bourbe de maléfice** transforme en grenouille quiconque se tient dedans. C'est un dégât au sol qui neutralise aussi — traiter la flaque comme létale, pas comme un tick."
---

Une unité unique valant 25 forces, et le mob le plus capable de retirer des joueurs d'un combat.

**Bourbe de maléfice** est un morceau de sol qui **transforme en grenouille quiconque s'y tient**,
incapable d'attaquer ou d'incanter, tout en infligeant 97k toutes les 2 secondes. Aucune
dissipation n'est listée et aucune interruption — seulement le fait de ne pas être dedans.

**Maléfice latent** fonctionne à retardement : quatre ou cinq secondes de ticks sur un joueur, puis
78k à tout le monde dans les 10 mètres *au retrait*. Le porteur choisit si ça tombe sur le groupe.

**Horion de flammes** est l'incantation interruptible, et vaut environ 860k si elle passe.

Une version de ce mob apparaît aussi pendant
l'[Avatar de Sephraliss](#/d/temple-of-sethraliss/codex/mob/133392).
