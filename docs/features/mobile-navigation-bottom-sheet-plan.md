# Feature: A Bottom Sheet for the More Menu, with a Pull-Up Shortcut

**Date:** 03/09/2026
**Status:** N1 to N4 complete - awaiting browser verification by the owner
**Programme:** Mobile-first over-50 UX remediation. Sits after Phase 4, before the
Phase 5 sessions.

## 1. What is actually wrong today

The app already has the affordance. `BottomNavBar.tsx:83` holds a fifth slot - a
`Menu` icon labelled **More** - beside Home, Hives, Records and Tasks. So "there
is something there" is already signalled.

**What is wrong is where it goes.** Tapping More at the bottom of the screen
slides `MobileDrawer` in from the **far left**: `fixed top-0 left-0 h-full w-72`
with `-translate-x-full` (`MobileDrawer.tsx:104`). The content appears at the top
of the screen, on the opposite side from the thumb that summoned it, and its
first item is about as far from that thumb as the screen allows.

That is the real defect, and it is independent of gestures. On a 360px phone the
drawer is 288px wide, so it already covers 80% of the screen - a bottom sheet
would be no more intrusive, and would put the first destination under the thumb
rather than under the ear.

## 2. What the recorded decisions allow

Two surveys were run before proposing anything, because this touches primary
navigation and a great deal has already been settled.

**Confirmed, and not being reopened:**

* **Four destinations plus More** is an owner decision dated 31/08/2026
  (`tasks/mobile-first-phase2-todo.md:177`), taken deliberately in the absence of
  usage data, with Hives chosen over Apiaries. **No destination moves in this
  work.**
* **Horizontal scrolling in the bar was removed on purpose** and the bar is now
  engineered so it cannot overflow. Nothing here re-introduces a scroll or a
  swipe-to-reveal *inside the bar*.

**The rule a swipe has to pass.** This programme has named hidden affordances as
a failure mode three separate times and fixed each: the scrolling nav bar
(`mobile-first-phase2-shell-and-overlays-plan.md:9`), the hover-only camera badge,
and the stats strip. The one gesture it deliberately **kept** is double-click on
the image viewer, and the recorded reason is the test to apply here
(`image-enlargement-affordance-plan.md:93`):

> the viewer already shows explicit zoom-in and zoom-out buttons, so double-click
> is a shortcut rather than the only way in.

A swipe-up passes that test **only because the More button already exists and
stays**. It is a shortcut, never the way in. That is also what WCAG 2.5.1
Pointer Gestures requires: a path-based gesture needs a single-pointer
alternative, and More is it.

## 3. Scope

* **In scope:** how the More menu is presented and dismissed on mobile.
* **Out of scope:** which destinations exist, which four sit in the bar, the
  desktop sidebar, and the drawer's contents and grouping. Every route stays
  exactly where it is.

## 4. Design

### N1 - The drawer becomes a bottom sheet

`MobileDrawer` keeps its contents, its grouping, its `inert` handling and its
`useDialogA11y` call (Escape, focus trap, focus restore). Only its geometry and
its transform change:

* Anchored bottom, full width, `rounded-t-2xl`, rising with the existing
  `slide-up` keyframes at `globals.css:432`.
* It sits **above** the bottom bar, using the established `--bottom-nav-inset`
  idiom, so **the More button stays visible and stays the control that closes
  it**. That preserves the `aria-expanded` relationship the parent plan requires
  (`:310`), and gives a second obvious way out.
* `max-h-[75vh]` with internal scrolling, since the sheet holds sixteen
  destinations in groups.

`ChatDialog.tsx:112` is already exactly this shape - `fixed above-bottom-nav
left-0 right-0 h-[70vh] rounded-t-2xl` - so this is an existing pattern in the
codebase rather than a new one.

### N2 - A grabber, and what it is for

A 40x4px rounded bar centred at the top of the sheet, inside a **48px** touch
target. It does two jobs: it reads as "this can be pulled", and it is the handle
for dismissal.

### N3 - The closed-state indication

The More slot's icon changes from `Menu` to **`ChevronUp`**, rotating to
`ChevronDown` while open.

This is the cheapest honest answer to "an indication that there is something
there": it costs no layout, no CSS variable change and no vertical space - which
matters, because seven surfaces already position themselves against
`--bottom-nav-inset`, and anything added above the bar would move all of them. A
chevron pointing up, in the slot the sheet rises from, states the direction of
the interaction. The label stays "More", so the slot is still readable as a word
rather than an icon alone.

### N4 - The swipe, as a shortcut only

* **Open:** an upward drag beginning **on the bottom bar itself**, not from the
  screen edge. This is not a detail - iOS's home indicator and Android's gesture
  navigation both claim an upward swipe from the bottom edge, so a gesture
  starting below the safe-area inset will be intercepted unpredictably. Starting
  on the bar keeps it in our own territory.
* **Close:** a downward drag on the grabber, or on the sheet body **only when it
  is already scrolled to the top**, so the gesture never fights the list's own
  scrolling.
* A threshold of roughly 40px, resolved on `touchend`, so a drag that changes its
  mind can be abandoned - WCAG 2.5.2 Pointer Cancellation.
* Plain touch handlers. **No library is added.** Nothing gesture-capable is
  installed today beyond `@dnd-kit`, which is a drag-and-drop toolkit and the
  wrong tool for this.
* Honoured by the existing `prefers-reduced-motion` block at `globals.css:1432`.

## 5. Risks

* **Gloves.** The audience works in beekeeping gloves, and the validation pack
  makes that its most direct test of the target floors. A swipe is less reliable
  through a glove than a tap, which is precisely why the swipe is additive and
  the 48px More button remains the route. If the sessions show the swipe is never
  used, it can be deleted without touching anything else.
* **Muscle memory.** The parent plan flags this at `:222`. Mitigated: the trigger
  stays in the same slot with the same label, and only the icon and the direction
  of travel change.
* **Scroll conflict** inside the sheet. Addressed by the scrolled-to-top
  condition in N4.
* **The seven `.above-bottom-nav` surfaces.** The sheet must sit correctly in
  z-order against the toast stack and the update banner, or a toast fired while
  it is open is trapped behind it. The drawer currently uses `z-[70]` over a
  `z-[60]` backdrop, above all of them; that ordering needs re-checking rather
  than inheriting.

## 6. Why now, before the Phase 5 sessions

The sessions are about to test *"Did not miss any primary navigation
destination"* (`mobile-first-phase5-validation-pack.md:128`). Running them
against a drawer that is about to be replaced spends the participants on a
version that will not ship. Building this first means the sessions validate the
navigation you intend to keep - and they are the right forum for deciding whether
the swipe earns its place.

## 7. Steps

1. [x] **N1** - the sheet geometry, keeping every existing accessibility behaviour.
2. [x] **N2** - the grabber.
3. [x] **N3** - the chevron and its open state.
4. [x] **N4** - the swipe handlers.
5. [x] **N5** - type-check, lint, suite; document; owner verifies in the browser.

## N1 as built

`MobileDrawer` keeps every behaviour it had - `useDialogA11y`, `inert` while
closed, the body-scroll lock, close-on-route-change, `aria-current` on the active
link, the header title and the explicit close button. Only its geometry changed:

* `fixed top-0 left-0 h-full w-72` with `-translate-x-full` becomes
  `fixed left-0 right-0 bottom-[var(--bottom-nav-inset)]`, full width, capped at
  `max-h-[75vh]`, `rounded-t-2xl` with a top border, sliding on `translate-y`.
* The panel is now the flex column itself, and the `nav` gained `min-h-0`, so the
  sixteen destinations scroll inside the cap instead of overflowing it.

All 23 `mobile-shell-a11y` tests pass unchanged, which is the useful signal: they
assert behaviour - Escape, focus trap, `inert`, ARIA wiring - rather than
geometry, so the presentation could change without weakening any of it.

**One defect was introduced and caught before it shipped.** The closed transform
was first written `translate-y-[calc(100%+var(--bottom-nav-inset)+1rem)]`. CSS
`calc()` is only valid with whitespace around `+` and `-`, and Tailwind spells a
space inside an arbitrary value as an underscore, so that declaration would have
been invalid, dropped, and **the sheet would have sat in its open position while
closed** - visible, though inert. Now
`translate-y-[calc(100%_+_var(--bottom-nav-inset)_+_1rem)]`.

The codebase does contain the unspaced form - `w-[calc(100%-1rem)]` at
`hives/page.tsx:570`, which works in production because Tailwind normalises
operators. That precedent has no `var()` in it, so the explicit underscore
spelling was kept rather than relying on the normaliser.

## N2 and N3 as built

**The grabber is decorative.** A 40x4px pill, centred, `aria-hidden`. It is not
a second close control: the X beside the title already is one, and exposing two
ways to do one thing to assistive technology is the same fault that downgraded
the hive overflow menu from a role it did not honour.

It is also shorter than the 48px the plan specified, and that is a deliberate
correction rather than a shortfall. The sheet already spends a header row on the
title and the close button; a further 48px of pure decoration would have put
about 128px of chrome above the first destination on a 480px sheet. The 48px
floor applies to the drag *target*, and the target N4 will attach is this band
together with the header row beneath it, which clears the floor comfortably. A
48px band on its own would have bought nothing but lost space.

**The More icon is now a chevron**, rotating 180 degrees while open rather than
swapping to a second icon - one import, and it animates over the same 300ms as
the sheet. A hamburger describes a list; a chevron describes a direction, which
is the useful thing to say now that the menu rises from that exact slot. The
label stays "More", so the slot is never an icon alone, and the accessible name
already switched between "Open menu" and "Close menu" before this change.

`prefers-reduced-motion` needs no new handling: the block at `globals.css:1432`
already forces `transition-duration` to 0.01ms on everything, which covers both
the rotation and the sheet.

All 23 `mobile-shell-a11y` tests still pass. They query by accessible name
rather than by icon, which is why swapping the icon changed nothing.

## N4 as built

`src/hooks/useVerticalSwipe.ts` - about fifty lines, no dependency added.
Swiping up on the bottom bar opens the sheet; swiping down on its grabber and
title row closes it.

**Three properties matter more than the detection.**

*Nothing is prevented.* No `preventDefault`, no `touch-action: none`. That was
the tempting fix for the page scrolling slightly during a swipe, and it would
have cost a user zoomed to 200% the ability to pan the page with a finger that
happened to land on a fixed bar, and cost everyone pinch-zoom starting there.
This audience needs both more than most, so the small scroll stays.

*Multi-touch is not a swipe.* The gesture is abandoned the moment a second
finger joins, so a pinch never resolves as a drag.

*It resolves on release*, so a drag that changes its mind can be taken back -
WCAG 2.5.2. And the More button, the close button and Escape all remain, which
is what WCAG 2.5.1 requires of a path-based gesture.

**The close gesture avoids the scroll conflict rather than resolving it.** The
plan proposed reading the list's scroll offset to decide whether a downward drag
meant "close" or "scroll up". The handlers instead sit on the grabber and title
row only - a region that does not scroll - so there is no ambiguity to resolve
and no offset to read. Simpler, and it cannot be wrong.

**`maxDuration` is 800ms**, deliberately slower than a flick, because a gesture
tuned to a bare fingertip would exclude a gloved one. It exists only so a slow
exploratory pan does not resolve as a swipe. It is the one number here worth
re-tuning from what the sessions show.

## QA audit (03/09/2026)

No Critical, no High. Two Medium, both fixed.

**Medium - a swipe beginning on a destination could also navigate.** The
handlers sit on the whole bar, which contains four `Link`s. Browsers withhold
the synthetic click once a touch passes their slop threshold and 45px is far
beyond it, so this should not fire - but if it did, the swipe would open the
sheet *and* navigate, and `MobileDrawer`'s route-change effect would then close
what had just opened. A capture-phase handler now suppresses a click arriving
within 400ms of a detected swipe. The window is tied to an actual swipe and
expires by itself, so no ordinary tap can be caught by it.

**Medium - the grabber was drawn in the divider colour.** `bg-border` is chosen
to recede, which is the opposite of what a handle needs to do for an audience
with reduced eyesight. Now `bg-text-tertiary`, matching the inactive bottom-bar
icons.

**Checked and found sound:** the hook returns a fresh handler object each render
so no stale `isMoreOpen` can be captured, while the gesture's start point lives
in a ref that correctly survives re-renders; `changedTouches[0]` is guarded;
`onTouchEnd` ignores a release while other fingers are still down; the bar's
swipe is guarded on `isMoreOpen` as well as being behind the backdrop when open,
so it can only ever open; and a tap on the close button inside the swipe region
travels far too little to register as a gesture, with nothing calling
`preventDefault` to interfere with it.

**Deliberately unchanged in N1:** the backdrop still covers the whole viewport,
including the bottom bar. Tapping More while the sheet is open therefore lands on
the backdrop and closes it, which is the behaviour the user wants, arrived at
without making the bar interactive underneath an `aria-modal` surface.

## 8. Database Connections (MCP Server)

None. Presentation only.
