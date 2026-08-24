# Security

## What there is to attack

Keystone Codex is a static site on GitHub Pages. There are no accounts, no passwords, no
database and no server-side state — nothing is stored about you anywhere, so there is nothing
about you to leak.

Two pieces are worth knowing about anyway:

- **Card content becomes HTML.** Every card under `content/` is written by contributors and
  rendered into the page. Raw HTML in a card is escaped and a link to a scheme we do not serve
  loses its tag, in [`src/lib/markdown.ts`](../src/lib/markdown.ts) — that is the one place it
  happens, and [its tests](../src/lib/markdown.test.ts) are the barrier itself. **A card that
  gets script to run is the report we most want.**
- **The collaboration relay.** A Cloudflare Worker (`relay/`) that carries route edits between
  people in a session. It persists nothing: the participants hold the only copies of their own
  route, so a relay that stores nothing cannot leak anything stored. A room code is not access
  control — whoever has the code joins, which is the design's intent, the same as a Discord
  invite. Do not put anything private in a route.

## Reporting something

**There is no private channel — please [open an
issue](https://github.com/Dudesons/keystone-codex/issues/new/choose).** Saying so is more useful
than pointing you at a form that does not exist, and given what is above, a public report is a
defensible trade: there are no accounts to take over and no data to exfiltrate, so the worst case
is script running in a reader's browser on a page that holds nothing of theirs.

Write in French or English, whichever you prefer, and include which page or card it happened on
and what you did.

**You do not need to publish a working exploit to report one.** Naming the field and the shape of
the input is enough for us to reproduce it — "a `note:` with a link whose scheme is written as an
HTML entity" is a complete report. Please leave the weaponised version out of the issue.

There is no bounty and no guaranteed response time — this is a spare-time project, and saying so
is more useful than a promise it cannot keep.

## Out of scope

- **Anything about World of Warcraft itself.** Report that to Blizzard.
- **A card that is factually wrong.** That is not a security problem — it is
  [an issue](https://github.com/Dudesons/keystone-codex/issues/new/choose), and a welcome one.
- **A room code being guessable by someone you gave it to.** Codes are drawn from the platform's
  CSPRNG, but a code is meant to be shareable; sharing it is how a session works.
