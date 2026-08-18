---
npcId: 134993

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 267702
    note: "Enferme un joueur dans une crypte. Il ouvre ensuite les cryptes une à une, en commençant par les vides — le groupe doit donc le libérer autrement."
  - id: 271290
    note: "Six secondes par crypte, et chacune ouverte raccourcit la suivante. L'attente devient moins mauvaise au fil du combat, la seule clémence de ce combat."
  - id: 267618
    note: "116k toutes les 2 s pendant 6 s, déclenchant Explosive Acids, et ça laisse Desiccation sur la cible en se terminant."
  - id: 267639
    note: "145k dans les 10 mètres et ça laisse un Sol brûlant. L'emmener quelque part dont le groupe n'aura pas besoin."
  - id: 267874
    note: "145k chaque seconde. L'arène se remplit de ces zones au cours du combat."
  - id: 1312146
    note: "194k à tout le monde, et ça ouvre des cryptes au hasard — relâchant des Momies à moitié terminées dont la Décharge abjecte doit être kickée."
  - id: 1312848
    note: "78k à tout le monde, et ça envoie les Assemblages funéraires proches embaumer les joueurs."

trap: "**Enfermer** met un joueur hors jeu, et Mchimba ouvre volontairement les mauvaises cryptes en premier. Le libérer soi-même — attendre qu'il le fasse, c'est accepter un combat à quatre."
---

Un combat qui parle d'un joueur qui n'y est pas.

**Enfermer** met quelqu'un dans une crypte, et l'infobulle en détaille la cruauté : il se déplace
entre les cryptes *en commençant par celles qui ne contiennent pas le joueur*. **Ouverture du
cercueil** prend six secondes chacune — en diminuant à mesure qu'on en ouvre — donc attendre
qu'il les traite toutes fait longtemps à quatre joueurs.

Pendant ce temps le sol se remplit de **Sol brûlant** venu de Brûlure de la corruption à 145k par
seconde, **Heurtoir d’éveil** ouvre des cryptes pour relâcher des
[Momies à moitié terminées](#/d/kings-rest/codex/mob/270502) dont la maladie de groupe doit être
kickée, et **Contrôle d’assemblages** envoie des
[Assemblages funéraires](#/d/kings-rest/codex/mob/137969) embaumer ceux qui restent.

Chaque mécanique du combat retire un joueur ou retire du sol. Ni l'un ni l'autre ne revient.
