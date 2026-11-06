# Tools card order and favourites

Status:
- Card order: built and tested by the owner, 06/11/2026. Task list: `tasks/tools-card-order-todo.html`.
- Favourites: built and tested by the owner, 06/11/2026. Task list: `tasks/tools-favourites-todo.html`.

## Goal

Let each beekeeper put the tools they use most at the top of the Tools page (`/dashboard/tools`). Which tools those are changes with the season.

## How it works

- An **Arrange tools** button sits next to the intro line on the Tools page. It shows only on the card grid, not inside a tool.
- In arrange mode the cards become a single-column list on every screen size, so up and down mean exactly that. Cards do not open tools while arranging.
- **Favourites** (owner decision, 06/11/2026):
  - Each row has a star button (48px). Starring moves the tool to the end of a **Favourites** section, which is always first.
  - Removing the star moves the tool back to the end of its own section. A tool is never in two places.
  - A starred tool shows a filled green star.
  - Screen readers hear "Add Feeding Calculator to favourites" or "Remove … from favourites", and then "Feeding Calculator added to favourites" once it is done.
  - In arrange mode an empty Favourites section says "Tap the star on a tool to add it here."
  - On the normal page an empty section is not shown, so with no favourites the page looks as it always did.
  - Favourites exist because moving cards between the standard sections would put them under headings they do not belong to.
- **Order:**
  - Each row has **Move up** and **Move down** buttons (48px). They move a tool within its section, Favourites included.
  - Screen readers hear "Move Feeding Calculator up", then where the tool now sits, for example "Feeding Calculator moved to position 2 of 3 in Calculators".
  - Keyboard focus stays on the button that was pressed.
- On phones the small tool icon is hidden in arrange mode, so the name has room beside the three buttons.
- **Save order** saves the favourites and the order together, shows "Tool order saved" and returns to the grid. If the save fails, it says "Could not save the tool order. Check your signal and try again." and stays in arrange mode, so nothing is lost.
- **Cancel** drops the changes. **Reset to the standard layout** clears the favourites and restores the standard order. It still needs Save order.
- Buttons rather than drag and drop: they work one-handed and with gloves, need no new library and meet WCAG 2.5.1.

## Storage

- Kept on the account, so it follows the beekeeper between phone and computer (owner decision D2, 06/11/2026).
- `profiles.tool_favourites jsonb` holds the starred tool ids in their Favourites order. NULL means no favourites.
- `profiles.tool_order jsonb` holds the order within the standard sections, without the starred tools. NULL means the standard order.
- A check on each column allows only an array of at most 50 entries.
- `jsonb` rather than `text[]`: the profile data export (`src/lib/database-export.ts`) writes lists as JSON text, which restores into `jsonb` but not into a Postgres array.
- The tool ids are `feeding`, `fondant`, `cells`, `varroa`, `gdd`, `tbr`, `diagnosis`, `profitloss`, `purchases`, `traceability`, `qr-tags` and `wild-colony`.
- Tools not in the saved order keep their standard place after the saved ones in their section. This covers a tool added in a later release. Unknown and repeated ids are ignored.
- Saving the standard order writes NULL to `tool_order`, so a later change to the standard order reaches that beekeeper. "Standard" here means the standard order with the starred tools left out.
- Grants:
  - Column-level `GRANT SELECT` on both columns to anon and authenticated, because profiles has column-level SELECT.
  - UPDATE is table-level, and RLS limits it to the user's own row.
  - Both columns are listed in `PROFILE_COLUMNS` (`src/lib/auth.ts`).
- Neither is a privileged column, so the profile guard trigger does not apply.
- Migrations: `supabase/migrations/20261106120000_profiles_tool_order.sql` and `20261106130000_profiles_tool_favourites.sql`.

## Code

- `src/lib/tool-order.ts` holds the pure helpers:
  - `parseToolOrder` checks a saved value.
  - `applyToolOrder` sorts each section by the saved order.
  - `withFavourites` puts the Favourites section first and takes the starred tools out of their sections.
  - `toggleFavourite` stars or unstars a tool.
  - `moveTool` swaps a tool with its neighbour in the same section.
  - `toolOrderIds` lists the ids in display order.
- `src/app/dashboard/tools/page.tsx`:
  - `TOOL_CATEGORIES` is the standard order.
  - Both columns are read with the user id on load. Only the card grid waits for them, for at most 5 seconds; on a failed read the standard layout is shown.
  - Arrange mode.
  - The save runs behind `useSubmitLock`, with a 10-second limit and a zero-row check.
- Tests: `tests/lib/tool-order.test.ts`.

## Not included

- Moving whole sections, or moving a tool into another standard section. Favourites covers this need.
- Drag and drop. It could be added later as a shortcut alongside the buttons.
- Hiding tools.
