---
npcId: 134599

# Traduction : seuls les champs de texte sont repris. `threat`, `role`, `tag` et `prio` sont
# des jugements, pas de la langue — ils restent dans la fiche de base et se fusionnent ici.

spells:
  - id: 1296052
    note: "43k par seconde pendant 20 secondes, et si ça expire, Conduct Lightning frappe la victime. Dissiper n'est pas seulement des dégâts économisés — ça supprime la charge utile."
  - id: 269116
    note: "+50 % de dégâts infligés, puisés à une source d'énergie proche. Une incantation de deux secondes — le plus gros buff isolé du trash."
  - id: 1291262
    note: "116k sur un joueur. Troisième dans l'ordre, derrière Extraire la puissance et la dissipation."
  - id: 1310739
    note: "+8 % de dégâts par charge, jusqu'à trois. Magie — le même buff que porte le Nimbus agité."

trap: "**Conduction imprégnée** se paie à l'expiration, pas pendant les ticks. La dissiper avant la fin des vingt secondes, sinon **Conduct Lightning** tombe sur celui qui la portait."
---

Quatre unités à 7 forces chacune, et le mob du donjon qui occupe le plus un soigneur.

**Conduction imprégnée** court vingt secondes à 43k par seconde, et la dernière phrase de
l'infobulle est le point important : *si elle expire, Conduct Lightning frappe la victime*. La
laisser s'écouler est strictement pire que de la retirer, et c'est une dissipation **magie**.

**Extraire la puissance** donne +50 % de dégâts infligés sur une incantation de deux secondes, et
elle est interruptible — un gros buff pour une petite fenêtre d'attention.

Il porte aussi **Accumulation de charge**, dissipable, et un simple **Éclair**. Quatre capacités,
dont trois réclament un global à quelqu'un.
