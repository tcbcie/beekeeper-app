# Feature: Image Enlargement — Affordance and Keyboard Access

**Date:** 31/08/2026
**Status:** Implemented — awaiting browser verification by the owner
**Programme:** Mobile-first over-50 UX remediation, item C of
`tasks/mobile-first-outstanding-todo.md`.

**Outcome:** the four thumbnails are now real buttons opened by a single tap, with an
accessible name and an always-visible magnifier badge. The viewer's three controls
meet the 44px floor and carry `aria-label`. ESLint clean, no `src` type errors, suite
unchanged at 18 failed files / 137 failed / 661 passed.

**One deviation from section 3.** The viewer's controls did **not** adopt
`.fj-icon-btn`. That class sets token colours and hover backgrounds designed for the
app surface, and they would fight the deliberate black-on-photograph overlay styling.
An explicit `min-h-[44px] min-w-[44px]` gives the same target size without changing
the appearance. `type="button"` was added to all three as well: the viewer currently
mounts at page level rather than inside a form, but nothing guarantees that stays
true.

## 1. Overview

The parent plan records this as a P2: *"Image enlargement relies on double-click"*,
awkward with reduced dexterity and unreliable on touch. Reading the five call sites
turns up two things the finding did not say.

**The thumbnails are `<div>`s, not buttons.** They carry `onDoubleClick` and
`cursor-pointer` but no `role`, no `tabIndex` and no accessible name. So they are not
in the tab order and have no keyboard activation path at all: **a keyboard or
screen-reader user cannot open a photograph by any means.** That is a WCAG 2.1.1
failure, not a P2 convenience issue, and it is the more serious half of this item.

**The fifth site is not the same thing as the other four.** `ImageZoomModal.tsx:146`
is a zoom toggle *inside* the already-open viewer, not a way of opening it. Section 4
explains why converting that one would be a regression.

## 2. Scope & Simplicity

* **In Scope:**
  - The four thumbnails that open the viewer: `InspectionCard.tsx:105`,
    `VarroaCheckCard.tsx:48`, `InspectionForm.tsx:2103`, `VarroaCheckForm.tsx:475`.
  - Single tap or click to open, keyboard operability, an accessible name, and a
    visible affordance that does not depend on hover.
  - The viewer's own three control buttons, which are ~36px and below the 44px floor
    this programme set in Phase 1.
* **Out of Scope:**
  - Changing the viewer's zoom, pan or close behaviour. See section 4.
  - Any change to image upload, storage, URL normalisation or the `onImageClick`
    contract.
  - Extracting a shared thumbnail component. Four call sites share a shape, but the
    two cards carry `thumbnailLoadFailed` state the two forms do not, so a common
    component would need a conditional that earns nothing. Four small in-place edits
    touch less code than one new abstraction plus four rewrites.

## 3. Technical Design

### The four opening sites

Each is the same shape today: a `<div>` with `cursor-pointer`, `onDoubleClick`, a
`title` reading "Double-click to enlarge", wrapping a fill `<Image>` and a Camera
overlay that is `opacity-0 group-hover:opacity-100`.

Each becomes a `<button type="button">` with:

* `onClick` instead of `onDoubleClick` — one tap, one click.
* `aria-label="View larger"` plus the record type, so the name is meaningful out of
  context: "View larger inspection photo".
* `title="View larger"`, replacing copy that instructs a gesture we no longer want.
* The hover-only Camera overlay replaced by a small **always-visible magnifier
  badge** in the corner. Hover states do not exist on touch, so an affordance that
  only appears on hover is invisible to exactly the users this programme serves.

`type="button"` matters: two of the four sit inside `<form>` elements, and a bare
`<button>` defaults to `type="submit"`. Without it, opening a photograph would
submit the inspection.

In `InspectionForm` and `VarroaCheckForm` the thumbnail sits in a `group` wrapper
beside a separate remove control. That control is a **sibling**, not a child, so
converting the thumbnail to a button nests nothing.

### Target size

The thumbnails are 48px (`InspectionCard`), 64px (`VarroaCheckCard`) and 80px (both
forms). All already meet the 44px floor as buttons; no sizing change is needed.

### The viewer's controls

`ImageZoomModal` zoom-in, zoom-out and close are `p-2` around 20px icons — about
36px, under the 44px floor Phase 1 set everywhere else. They also carry only `title`,
so their accessible name depends on a tooltip attribute. They gain `aria-label` and
the shared `fj-icon-btn` floor.

## 4. Why the viewer's double-click stays

`ImageZoomModal.tsx:146` toggles zoom on an image that is already open. Converting it
to a single click would break two things:

* The image's parent already binds `onMouseDown`, `onMouseMove`, `onMouseUp` and
  `onClick` for drag-to-pan. A single click fires on mouse-up at the end of a drag,
  so panning a zoomed image would toggle zoom on release.
* The parent's `handleContentClick` distinguishes a click on the backdrop (close)
  from a click on the content. Adding a competing single-click handler on the image
  puts those in conflict.

The affordance argument does not apply here either: the viewer already shows explicit
zoom-in and zoom-out buttons, so double-click is a shortcut rather than the only way
in. Keeping it costs nothing and removing it risks a working interaction.

The on-screen hint at `:152` already reads "Double-click to zoom", which stays
accurate.

## 5. Edge Cases & Risks

* **`type="submit"` by default** — covered above, and the single most likely way to
  break something here.
* **Nested interactive elements.** Checked: no card root has an `onClick`, so the new
  buttons are not inside another activation target.
* **`thumbnailLoadFailed`.** Both cards swap the thumbnail for a placeholder when the
  image 404s. The placeholder is not interactive and must stay that way — there is
  nothing to enlarge.
* **The forms' preview can be a blob URL** from `imagePreview` before upload. That
  already works with double-click and is unaffected by the handler change.
* **Badge contrast.** The magnifier badge sits over an arbitrary photograph, so it
  needs its own opaque backing rather than relying on the image behind it.

## 6. Implementation Phases

1. **C1** — the four thumbnails: button, `onClick`, `aria-label`, `title`, and the
   always-visible badge.
2. **C2** — the viewer's three controls: 44px floor and `aria-label`.
3. **C3** — verify with type-check and lint, and update this document and the
   backlog.

## 7. Database Connections (MCP Server)

None. Presentation and event handling only. No schema, RLS policy, RPC or payload is
affected.
