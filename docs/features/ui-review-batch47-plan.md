# Batch 47: UI Review

**Status:** Implemented 29/10/2026, waiting for the owner's test.
**Checklist:** `tasks/ui-review-batch47-todo.html`
**Method:** the `design-taste-frontend` skill, applying its app-screen rules (`references/app-screens.md`).
- **Static lint:** `lint.mjs --app` over all of `src`.
- **Login page:** the public login page measured with `inspect.mjs --app` at 1440, 768 and 390px.
- **Signed-in screens:** screenshots of six signed-in screens taken in the owner's Chrome, read only.
- **Code review:** three agents went through the shell, the core screens and the remaining screens.

It is a review, not a redesign: the green and amber field-journal look is kept.

**Owner decisions:**
- The 14px sweep covers all screens.
- The device fonts stay, and the font tokens are renamed to say so.

## Findings fixed

### Usability and contrast

- **Install banner on the login page (`InstallPrompt.tsx`).** On phones it covered the Log in button, because it floated at the bottom-bar inset on pages without a bar.
  - It now shows on `/dashboard` routes only (`usePathname`).
  - The fill is a solid `bg-amber-800` instead of a 2–3:1 amber gradient, with full white text.
  - `NotificationPermissionBanner` gets the same fill.
- **"Update available" card (`UpdateNotification.tsx`).** It was centred by translate with no width, so it shrank to a narrow column on phones. It now uses `inset-x-4 mx-auto max-w-md`, and the title is in sentence case.
- **Contrast fixes:**
  - The bottom bar's active label is `forest-800`.
  - The dashboard's Admin pill uses `fj-badge-neutral`. The ticket count is `red-700` with an `aria-label`, and the ticket chips use -700/-800 fills with no pulse.
  - The DAFM summary tiles are plain bordered tiles with ink figures; before, they were white text on 500-shade gradients at about 2:1. The header and the info band are flat.
  - The -800 figures on inspection, varroa and harvest cards gain `dark:*-300` colours.
  - The lineage labels drop `opacity-60/70`.
- **Delete weight on apiary cards (`ApiaryCard.tsx`).** Edit is neutral and fills the row. Delete is a narrow neutral button with red text. "View on community map" is neutral, and two emoji are removed.
- **Hives bulk bar.** Move, Treatment, Feeding and Clone are plain buttons; their icons tell them apart.
- **Colour classes that never showed.** `Button` always adds its tone class, and the neutral tone won the cascade, so `className="fj-btn fj-btn-success"` rendered grey. That is why "Add Apiary" looked grey in production.
  - Green actions now pass `tone="success"`: Add Apiary, Save, and Look up coordinates.
  - The blue and purple classes are dropped, which keeps them neutral as they already looked. This applies to the apiaries page, QR tags and Manage Nucs.
- **Tap targets raised to 48px (about 22).**
  - Clear-search crosses: a 48px square at the field's right edge.
  - The queen tracker's outcome chips and its Cancel/Save; Save is also `forest-800` instead of emerald-500 at 2.5:1.
  - The batch form's toggles, the Manage Nucs chips, and the distribution and tracking headers and sorts.
  - On the batches page: the period buttons and the weight buttons (48px instead of 40px).
  - Five CRM buttons (from 44px), and the nuc weight delete button, which also gets an `aria-label`.
- **Words, not symbols.** ✓/✗ became Yes/No in report tables and the association list. Subscription badges show Active/Expired, and Approve/Reject lose their symbols. The inspection card shows Yes/No, and the varroa card says "Reached: treatment needed".
- **Mel's button.** The dashboard layout reserves room at the foot (`pb-[calc(var(--bottom-nav-inset)+4.5rem)] md:pb-24`), and the faded button is 48px at 80% opacity.

### Text size and capitals (app-wide sweep)

- **The sweep:** 323 `text-xs` (12px) became `text-sm` (14px), in 81 files. One `text-[11px]` became `text-sm`. 157 `uppercase` classes and 112 `tracking-*` classes were removed.
  - The removed capitals include the sidebar group labels (now an unstyled 48px heading row at 14px), the "DASHBOARD" eyebrow, table headers ("ACTIONS", "COLOR") and micro labels.
- **Skipped:**
  - `HiveListCard.tsx`, which has the owner's uncommitted edits.
  - Printed labels (`src/components/labels/`) and the PDF invoice.
  - Code inputs that are typed in capitals on purpose: Eircode, queen codes and the tag code.
- **QA fix:** task priority badges relied on `uppercase` for "high"/"urgent", so they now use `capitalize`.

### Consistency

- **Emoji removed from page titles:** Queens, Apiaries, Queen Rearing, Tasks & Events, Customers, Sales Insights and Orders.
- **Emoji removed from labels:** the task checklists, "Email reminder", Public Preview, the inspection form's honey super label, and the varroa treatment warning (now an `AlertTriangle` icon). The rearing ranking shows 1, 2, 3 instead of medals.
- **British English:** "Color" became Colour, "Colors" became Colours, "behavior" became behaviour, and "Powdered Sugar" became "Icing Sugar".
- **Green for selections:** the Records time-period chips (now with `aria-pressed`), the Tasks view toggles and the batch-milestones toggle select in `forest-800`. Save Inspection is `forest-800` too; it was blue before.
- **Log out:** a neutral button, not a red one. The no-subscription icon is amber, not blue.
- **Scale weight changes (`ApiaryWeatherRow` `WeightChip`):** ink with a sign and an arrow, and grey for 0.00. Before, any value of zero or more showed in green.
- **One h1 per page:** the top bar's "HiveCraic" is a `<p>`, and its logo has empty alt text because the name sits beside it.
- **Top bar:** solid surface with a border; no glass blur or large shadow.
- **Removed:**
  - The skeleton shimmer, so placeholders are flat.
  - The unused `.glass*` utilities.
  - PageShell's two blurred colour blobs.

### Font

- `--font-dm-sans`, `--font-dm-serif` and `--font-geist-mono` are renamed `--font-ui-sans`, `--font-ui-serif` and `--font-ui-mono`. They always held each device's own fonts; DM Sans and DM Serif were never loaded, and `next/font/google` was removed on 28/02/2026 to allow offline builds.
- The body uses `var(--font-ui-sans)`, and the scale chart uses the same stack.

## Measured

- **Design lint:** 347 FAIL and 544 WARN before, 241 FAIL and 530 WARN after.
- **By pattern:**

  | Pattern | Before | After |
  |---|---|---|
  | Tiny capital labels | 58 | 0 |
  | Emoji | 93 | 59 (most of the rest are in console messages and `HiveListCard`) |
  | Gradients | 36 | 27 |
  | Glass (blur) | 17 | 10 |

- **Checks:** type-check clean; `eslint .` reports 0, outside the owner's design-skill folder; 869 tests pass; one test string was updated ("Update available").

## Not done (each needs its own decision)

- The navy and slate dark theme.
- About 120 uses of the blue and purple button tones, mostly on admin screens.
- About 110 resting shadows on cards that already have a border.
- The field-journal texture and glow.
- Right-aligned numbers in report tables.
- The 36px serif dashboard title, which is above the skill's 32px limit.
- **Owner's own file:** `HiveListCard.tsx` still has about ten emoji. Its "Overview & Records" button is already corrected to `forest-800` by the global white-on-green rule.

## Rules

- **Text size:** no `text-xs` or 12px text on screen; 14px is the floor, and labels are sentence case without tracking.
- **Colour:** selections and saves are `forest-800`, red is for destructive actions only, and no emoji appears in titles or labels.
- **The Button component:** pass `tone`; never put an `fj-btn-*` colour class in its `className`.
- **Floating banners:** only where the bottom bar exists, and never over a page's main action.
