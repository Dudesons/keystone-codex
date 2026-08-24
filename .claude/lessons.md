# Lessons

A log of corrections. Every time RwlRwlRwlRwl corrects a mistake, what gets written here is
the **rule** that would have avoided it — not the story of the incident.

To be re-read at the start of a session, before working on this repository.

## Format

```markdown
## YYYY-MM-DD — Short title of the rule

**What happened:** one or two factual sentences.
**The rule:** the imperative to apply next time.
**Scope:** where it applies (file, domain, or "everywhere").
```

A lesson that cannot be phrased as an imperative is not one: it is an anecdote, and it does
not belong here. If two lessons say the same thing, merge them.

---

<!-- Most recent lessons at the top. -->

## 2026-08-24 — Measure a change by driving the real code path, not a replica of it

**What happened:** Asked whether hardening the markdown renderer would break existing cards, a
script rendered every `content/**.md` field through "the current pipeline" and reported 19
regressions in HTML comments — including a claim that `_dungeon.md`'s scaffold notes would become
visible text. All 19 were false. The script fed the raw markdown body to `marked`, while
`content.ts` strips HTML comments before rendering; the real answer was zero differences. The
false regression was reported to RwlRwlRwlRwl and a comment special case was nearly built for it.

**The rule:** When measuring whether a change alters behaviour, drive the **production** function,
not a reimplementation of it. If the real path cannot be called directly, first prove the replica
agrees with it on today's input — identical output, not merely similar — before trusting a single
difference it reports. A replica that diverges reports its own bugs as findings.

**Scope:** Everywhere, and especially for "will this break anything" questions, where the whole
value of the answer is that the harness and the app agree.

**What happened:** A line-by-line read of two `.lua` exports missed six bosses each losing
thirty forces, because `["count"] = 0,` already occurred for dozens of other mobs — a line whose
text exists anywhere in the other file drops out of a line-membership diff even when the record
it belongs to changed.
**The rule:** When asked what changed between two versions of a structured data file, do not
answer from a line-by-line or set-membership diff. Compare structurally, by the record's own
identity (id, key), or use the tool built to do that.
**Scope:** Everywhere a generated or exported data file is compared across versions; in this
repository, `scripts/mdt-diff.mjs` is that tool for MDT's `.lua` exports.

## 2026-08-25 — Prove a thing is absent before reporting it absent

**What happened:** I told RwlRwl that `importRoute` had no check that a payload's dungeon matched
the document's. It had one — `RoutePanel.handleImport` compared the slugs. The check was simply in
the wrong place: it ran *after* `importRoute` had already replaced the document, so the reader got
an error message and a corrupted route.

I had read `importRoute` itself and concluded "no check" from its absence there, without searching
for handling anywhere else. I found the truth by accident, when switching branches surfaced a
`route.wrongDungeon` string I had never looked for.

**The rule:** A claim that something is missing is a negative, and a negative needs a search, not a
reading. Before reporting an absent guard, validation or handler, grep the whole tree for its
symptoms — the error string, the message key, the concept — not just the function you expected it
in. A report asserting a negative deserves more evidence than one asserting a positive.

**The tell I ignored:** eleven existing tests imported one dungeon's fixture into another dungeon's
document and asserted happily on the result. That was direct evidence the import completed, which
should have made me ask what the caller did afterwards.

**Scope:** Every "there is no X" claim — missing validation, missing test coverage, an unhandled
case — and especially before it goes into a design document or a commit message, where a wrong
negative outlives the conversation.
