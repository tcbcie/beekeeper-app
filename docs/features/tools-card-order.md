# Tools card order

Status: built and tested by the owner, 06/11/2026. Task list: `tasks/tools-card-order-todo.html`.

## Goal

Let each beekeeper put the tools they use most at the top of each section on the Tools page (`/dashboard/tools`).

## How it works

- An **Arrange tools** button sits next to the intro line on the Tools page. It shows only on the card grid, not inside a tool.
- In arrange mode the cards become a single-column list on every screen size, so up and down mean exactly that. Cards do not open tools while arranging.
- Each row has **Move up** and **Move down** buttons (48px). Screen readers hear "Move Feeding Calculator up". After a move they hear where the tool now sits, for example "Feeding Calculator moved to position 2 of 3 in Calculators". Keyboard focus stays on the moved tool.
- A tool moves only within its own section. The sections keep their order (owner decision D1, 06/11/2026).
- **Save order** saves once, shows "Tool order saved" and returns to the grid. If the save fails, it says "Could not save the tool order. Check your signal and try again." and stays in arrange mode, so nothing is lost.
- **Cancel** drops the changes. **Reset to the standard order** puts the draft back to the default. It still needs Save order.
- Arrow buttons rather than drag and drop: they work one-handed and with gloves, need no new library and meet WCAG 2.5.1.

## Storage

- The order is kept on the account, so it follows the beekeeper between phone and computer (owner decision D2, 06/11/2026).
- Column: `profiles.tool_order jsonb`. It holds a JSON array of tool ids. NULL means the standard order.
- A check allows only an array of at most 50 entries.
- `jsonb` rather than `text[]`: the profile data export (`src/lib/database-export.ts`) writes lists as JSON text, which restores into `jsonb` but not into a Postgres array.
- The tool ids are `feeding`, `fondant`, `cells`, `varroa`, `gdd`, `tbr`, `diagnosis`, `profitloss`, `purchases`, `traceability`, `qr-tags` and `wild-colony`.
- Tools not in the saved list keep their standard place after the saved ones in their section. This covers a tool added in a later release. Unknown ids are ignored.
- Saving the standard order writes NULL, so a later change to the standard order reaches that beekeeper.
- Grants:
  - Column-level `GRANT SELECT (tool_order)` to anon and authenticated, because profiles has column-level SELECT.
  - UPDATE is table-level, and RLS limits it to the user's own row.
  - The column is listed in `PROFILE_COLUMNS` (`src/lib/auth.ts`).
- It is not a privileged column, so the profile guard trigger does not apply.
- Migration: `supabase/migrations/20261106120000_profiles_tool_order.sql`.

## Code

- `src/lib/tool-order.ts` holds the pure helpers:
  - `parseToolOrder` checks the saved value.
  - `applyToolOrder` sorts each section by the saved order.
  - `moveTool` swaps a tool with its neighbour in the same section.
  - `toolOrderIds` lists the ids in display order.
- `src/app/dashboard/tools/page.tsx`:
  - `TOOL_CATEGORIES` is the standard order.
  - The saved order is read with the user id on load. If the read fails, the standard order is shown.
  - Arrange mode.
  - The save runs behind `useSubmitLock`, with a zero-row check.
- Tests: `tests/lib/tool-order.test.ts`.

## Not included

- Moving whole sections, or moving a tool between sections.
- Drag and drop. It could be added later as a shortcut alongside the arrows.
- Hiding tools.
