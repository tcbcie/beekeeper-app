# Hive card header layout (16/11/2026)

`src/components/hive/HiveListCard.tsx`, top of each card on the Hives list.

```
 ┌──────────────────────────────┐
 │ 29-DA                    [⋮] │   row 1: hive number, menu top right
 │ [active] [◷ Inspected 29 days│   row 2: every pill, left-aligned, wrapping
 │  ago] [▦ HC-GH7K2] ⚖         │
 │ [ Overview & Records       ] │
 └──────────────────────────────┘
```

- **Row 1:** the hive number takes the free width (`min-w-0 break-words`, so a compound number
  such as "77-HMN+|70-HMN+" wraps), and the ⋮ menu (owner only) stays top right.
- **Row 2**, in this order:
  - status
  - queenless
  - Inspected N days ago
  - QR tag
  - scale icons
  - shared via, or shared with
  - archived
  - active tasks
  - treatment on (last, because it is the longest and wraps)
- All pills are `px-2 py-1` so a wrapped row lines up.

**Why:** the header used to be two side-by-side columns: the name with descriptive pills on the
left, and status, inspected and ⋮ in a right-aligned cluster. Cards are about 300px wide on a
phone and in the desktop grid alike, so the cluster wrapped into three rows. The menu ended up
alone on its own row, "Inspected" broke over two lines, the QR code was cut short and the space
under the name was wasted.
