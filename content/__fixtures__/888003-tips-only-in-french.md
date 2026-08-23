---
# A card with no `tips:` at all in the base language. Its French sibling adds one that the
# base file lacks entirely — unlike 888002, where both locales carry tips. That is what makes
# this pair able to catch `getIndicators()` ignoring locale in its cache key: 888002 would
# answer `true` in both languages even if the key dropped locale, since both of its files carry
# tips. This one only would fail such a bug, because English and French must answer differently.
# The npcId is synthetic — the __fixtures__ slug matches no dungeon, so nothing here is
# reachable from the app.
npcId: 888003
---
