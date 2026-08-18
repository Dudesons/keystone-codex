---
npcId: 234660

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 1230304
    note: "Vidée de sa gangrène, elle se retourne contre Kystia — et c'est ce qui met en place Explosion chaotique. L'amener là est l'objectif, pas un effet secondaire."
  - id: 1230289
    note: "Kystia la ré-imprègne tant qu'elle est au-dessus de 20 % de vie. Le seuil est la mécanique : descendez-la en dessous."
  - id: 1253811
    note: "Cône frontal, 194k par seconde pendant 5 s. Près d'un million pour qui reste dedans du début à la fin."
  - id: 1228198
    note: "58k d'entrée, puis 107k toutes les 3 s pendant 30 secondes. Magie — et une demi-minute, c'est assez long pour que ça tourne encore à l'imprégnation suivante."

trap: "Kystia ne la ré-imprègne qu'au-dessus de 20 % de vie. Descendre Mordicus sous ce seuil est ce qui casse la boucle et ouvre la fenêtre de burn."
---

Le familier de Kystia, et l'interrupteur sur lequel le combat bascule.

La boucle est énoncée noir sur blanc dans deux infobulles : **Imprégnation illicite** la rend
hostile *tant qu'elle est au-dessus de 20 % de vie*, et **Infusion de Lumière** — lancée une fois
qu'elle est vidée de sa gangrène — est ce qui étourdit
[Kystia](#/d/murder-row/codex/mob/234648) dans une **Explosion chaotique** à +115 % de dégâts
subis.

Les dégâts sur Mordicus ne sont donc pas des dégâts gâchés sur un add. C'est la mécanique.

Tant qu'elle est hostile, **Vaporisation gangrenée** est un frontal de 5 secondes valant près
d'un million, et **Crachat corrosif** empile une brûlure magique de trente secondes.
