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

## 2026-08-18 — Diff data files by identity, not by line membership

**What happened:** A line-by-line read of two `.lua` exports missed six bosses each losing
thirty forces, because `["count"] = 0,` already occurred for dozens of other mobs — a line whose
text exists anywhere in the other file drops out of a line-membership diff even when the record
it belongs to changed.
**The rule:** When asked what changed between two versions of a structured data file, do not
answer from a line-by-line or set-membership diff. Compare structurally, by the record's own
identity (id, key), or use the tool built to do that.
**Scope:** Everywhere a generated or exported data file is compared across versions; in this
repository, `scripts/mdt-diff.mjs` is that tool for MDT's `.lua` exports.
