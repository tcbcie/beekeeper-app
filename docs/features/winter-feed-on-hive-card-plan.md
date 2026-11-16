# Winter feed on the hive card — plan (16/11/2026)

**Request:** beside the stores gauge, show how much feed a hive has been given in preparation for
winter, counting from the start of the season.

**Decisions (owner, 16/11/2026):**

- Count from **1 August**, the same season start as the stores dial (`storesSeasonStart`).
- All syrups add up as **one syrup total**; other feeds total by their own name and unit.

**Design:** one or two extra lines under the dial text, no new box:

```
 ╭──╮   100% · Enough
 │ ╲│   Stores · Estimated 18 October
        Fed 4 times since 1 August
        2.5 kg Fondant · 4 L syrup
```

**Changes:** `src/lib/feeding.ts` (`summariseFeeds`, shared `normaliseUnit`), `useHivesList`
(adds `feed_type, quantity, unit` to the existing feedings select, sets `winter_feed`),
`types/hive.ts`, `StoresDial.tsx` (`feed` prop), `HiveListCard.tsx`.

Built and documented in [winter-stores-level.md](winter-stores-level.md#winter-feed-line-16112026).
