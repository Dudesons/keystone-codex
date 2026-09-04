# Codex notes

One file per dungeon, holding the two things the `content/**.md` cards cannot: **what still
needs RwlRwlRwlRwl's verdict**, and **the context needed to pick a dungeon back up** after a
session ends.

These are working notes, not documentation. A dungeon's file shrinks as its verdicts are
settled, and can be deleted once nothing is left open — the cards are the source of truth,
these are the scaffolding around writing them.

## What goes in a file

| Section | Holds |
| --- | --- |
| **Verdicts to confirm** | Every `threat` proposed from the data rather than judged, with the one-line reason. Confirm or correct in bulk. |
| **Open questions** | Things no source answers, where a guess would be a lie. |
| **Disagreements** | Where MDT and Method contradict each other, and which one the card follows. |
| **Written from** | Which sources were read, so the next pass does not re-derive them. |

## Writing conventions, learned the hard way

- **`note:` and `trap:` take markdown**, like the prose body — emphasis and links work. They
  are rendered *inline* (`inlineMarkdown` in `src/lib/content.ts`), so a heading or a list
  will not do what you want in a one-line field; emphasis is the point.
  A spell's Wowhead description is deliberately **not** rendered as markdown: it is their data,
  not our writing.
- **Bosses carry no `threat`.** The ring is gold regardless, so the field would only add a
  badge. A real boss is worth 0 forces in every dungeon, so a boss kill never moves the count.
  The Blinding Vale was the one exception, at 30 forces each, until MDT 6.2.3 dropped its six
  to 0. Mind that MDT's `isBoss` flag is over-set in places — the entries a note demotes to
  trash, such as four of Ruby Life Pools' eight, do carry forces.
- **Never write a spell ID that is not in `src/data/generated/<slug>.json` for that exact
  mob.** Five invented IDs made it into Altar of Fangs before this was caught. When Method
  names an ability MDT does not carry, say so in the prose and leave the spell list alone.
- **Do not quote unscaled tooltip figures.** Several spells carry placeholder damage (10, 54,
  a radius field holding a damage value). Describe the mechanic, skip the number, and record
  the case in the dungeon's notes file.

## The rule these notes exist to protect

`threat` and the `trap` sentence are judgement, and no tooltip contains them. Anything
proposed here was derived from real numbers — forces, health, cast times, damage — and is
marked as a proposal precisely so it can be overruled without archaeology.

Spell IDs, damage figures and dispel types are never proposals. They are read out of
`src/data/generated/`, and a card that names one MDT does not carry is a bug.
